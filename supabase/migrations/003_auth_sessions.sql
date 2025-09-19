-- Authentication sessions table for tracking cross-application authentication flows
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token TEXT UNIQUE NOT NULL,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_url TEXT NOT NULL,
  state JSONB, -- Additional state data from the originating application
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for auth_sessions
CREATE INDEX idx_auth_sessions_session_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_application_id ON auth_sessions(application_id);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_status ON auth_sessions(status);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- Add trigger for updated_at
CREATE TRIGGER update_auth_sessions_updated_at 
  BEFORE UPDATE ON auth_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update applications table to include allowed redirect URLs
ALTER TABLE applications 
ADD COLUMN allowed_redirect_urls TEXT[] DEFAULT '{}';

-- Create index for allowed_redirect_urls
CREATE INDEX idx_applications_allowed_redirect_urls ON applications USING GIN(allowed_redirect_urls);

-- Function to validate redirect URL for an application
CREATE OR REPLACE FUNCTION validate_redirect_url(app_id UUID, redirect_url TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  allowed_urls TEXT[];
  url_pattern TEXT;
BEGIN
  -- Get allowed redirect URLs for the application
  SELECT allowed_redirect_urls INTO allowed_urls
  FROM applications
  WHERE id = app_id AND status = 'active';
  
  -- If no application found or no allowed URLs configured, return false
  IF allowed_urls IS NULL OR array_length(allowed_urls, 1) IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the redirect URL matches any of the allowed patterns
  FOREACH url_pattern IN ARRAY allowed_urls
  LOOP
    -- Support wildcard matching (e.g., https://myapp.com/*)
    IF redirect_url LIKE url_pattern THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create authentication session
CREATE OR REPLACE FUNCTION create_auth_session(
  app_id UUID,
  redirect_url TEXT,
  user_email TEXT DEFAULT NULL,
  session_state JSONB DEFAULT NULL,
  expires_in_minutes INTEGER DEFAULT 30
)
RETURNS TEXT AS $$
DECLARE
  session_token TEXT;
  session_id UUID;
BEGIN
  -- Validate redirect URL
  IF NOT validate_redirect_url(app_id, redirect_url) THEN
    RAISE EXCEPTION 'Invalid redirect URL for application';
  END IF;
  
  -- Generate unique session token
  session_token := encode(gen_random_bytes(32), 'base64url');
  
  -- Insert auth session
  INSERT INTO auth_sessions (
    session_token,
    application_id,
    user_email,
    redirect_url,
    state,
    expires_at
  ) VALUES (
    session_token,
    app_id,
    user_email,
    redirect_url,
    session_state,
    CURRENT_TIMESTAMP + (expires_in_minutes || ' minutes')::INTERVAL
  ) RETURNING id INTO session_id;
  
  RETURN session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete authentication session
CREATE OR REPLACE FUNCTION complete_auth_session(
  session_token TEXT,
  authenticated_user_id UUID
)
RETURNS TABLE(
  application_id UUID,
  redirect_url TEXT,
  state JSONB
) AS $$
DECLARE
  session_record RECORD;
BEGIN
  -- Get and update the session
  UPDATE auth_sessions 
  SET 
    user_id = authenticated_user_id,
    status = 'completed',
    completed_at = CURRENT_TIMESTAMP
  WHERE 
    session_token = complete_auth_session.session_token
    AND status = 'pending'
    AND expires_at > CURRENT_TIMESTAMP
  RETURNING * INTO session_record;
  
  -- If no session found or expired
  IF session_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session token';
  END IF;
  
  -- Return session details for redirect
  RETURN QUERY SELECT 
    session_record.application_id,
    session_record.redirect_url,
    session_record.state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions (should be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_auth_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_sessions 
  WHERE expires_at < CURRENT_TIMESTAMP 
    AND status IN ('pending', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;