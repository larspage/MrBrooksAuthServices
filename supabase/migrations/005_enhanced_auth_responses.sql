-- Enhanced authentication responses with membership information
-- This migration adds functions to retrieve user memberships and pricing information

-- Function to get user memberships with pricing information
CREATE OR REPLACE FUNCTION get_user_memberships_with_pricing(user_uuid UUID)
RETURNS TABLE(
  application_id UUID,
  application_name TEXT,
  application_slug TEXT,
  membership_id UUID,
  membership_status membership_status,
  tier_id UUID,
  tier_name TEXT,
  tier_level INTEGER,
  tier_features JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  renewal_date TIMESTAMP WITH TIME ZONE,
  monthly_price_cents INTEGER,
  yearly_price_cents INTEGER,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as application_id,
    a.name as application_name,
    a.slug as application_slug,
    um.id as membership_id,
    um.status as membership_status,
    mt.id as tier_id,
    mt.name as tier_name,
    mt.tier_level,
    mt.features as tier_features,
    um.started_at,
    um.ends_at,
    um.renewal_date,
    pp_monthly.price_cents as monthly_price_cents,
    pp_yearly.price_cents as yearly_price_cents,
    COALESCE(pp_monthly.currency, pp_yearly.currency, 'usd') as currency
  FROM user_memberships um
  JOIN applications a ON um.application_id = a.id
  LEFT JOIN membership_tiers mt ON um.membership_tier_id = mt.id
  LEFT JOIN pricing_plans pp_monthly ON mt.id = pp_monthly.membership_tier_id AND pp_monthly.billing_period = 'monthly'
  LEFT JOIN pricing_plans pp_yearly ON mt.id = pp_yearly.membership_tier_id AND pp_yearly.billing_period = 'yearly'
  WHERE um.user_id = user_uuid
    AND a.status = 'active'
  ORDER BY a.name, mt.tier_level DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log redirect validation errors with helpful instructions
CREATE OR REPLACE FUNCTION log_redirect_validation_error(
  app_id UUID,
  attempted_redirect_url TEXT,
  user_agent TEXT DEFAULT NULL,
  ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  app_record RECORD;
  error_message TEXT;
  instructions TEXT;
BEGIN
  -- Get application details
  SELECT id, name, slug, allowed_redirect_urls INTO app_record
  FROM applications
  WHERE id = app_id;
  
  IF app_record IS NULL THEN
    error_message := 'Application not found: ' || app_id::TEXT;
    instructions := 'Verify the application ID is correct and the application exists in the system.';
  ELSE
    error_message := 'Invalid redirect URL attempted for application "' || app_record.name || '" (' || app_record.slug || '): ' || attempted_redirect_url;
    
    -- Generate helpful instructions
    instructions := 'To allow this redirect URL, add it to the allowed_redirect_urls array for application "' || app_record.name || '". ';
    instructions := instructions || 'Current allowed patterns: ';
    
    IF app_record.allowed_redirect_urls IS NULL OR array_length(app_record.allowed_redirect_urls, 1) IS NULL THEN
      instructions := instructions || '[NONE CONFIGURED]. ';
    ELSE
      instructions := instructions || array_to_string(app_record.allowed_redirect_urls, ', ') || '. ';
    END IF;
    
    instructions := instructions || 'You can update this in Supabase by running: ';
    instructions := instructions || 'UPDATE applications SET allowed_redirect_urls = array_append(allowed_redirect_urls, ''' || attempted_redirect_url || ''') WHERE slug = ''' || app_record.slug || ''';';
  END IF;
  
  -- Log the error with instructions
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    created_at
  ) VALUES (
    'applications',
    COALESCE(app_record.id, app_id),
    'REDIRECT_VALIDATION_ERROR',
    jsonb_build_object(
      'attempted_redirect_url', attempted_redirect_url,
      'user_agent', user_agent,
      'ip_address', ip_address::TEXT,
      'application_name', app_record.name,
      'application_slug', app_record.slug,
      'current_allowed_urls', app_record.allowed_redirect_urls
    ),
    jsonb_build_object(
      'error_message', error_message,
      'instructions', instructions
    ),
    NULL, -- No specific user for this system error
    CURRENT_TIMESTAMP
  );
  
  -- Also log to PostgreSQL logs for immediate visibility
  RAISE WARNING 'REDIRECT_VALIDATION_ERROR: % Instructions: %', error_message, instructions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to create authentication session with better error logging
CREATE OR REPLACE FUNCTION create_auth_session_enhanced(
  app_id UUID,
  redirect_url TEXT,
  user_email TEXT DEFAULT NULL,
  session_state JSONB DEFAULT NULL,
  expires_in_minutes INTEGER DEFAULT 30,
  user_agent TEXT DEFAULT NULL,
  ip_address INET DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  session_token TEXT;
  session_id UUID;
BEGIN
  -- Validate redirect URL with enhanced error logging
  IF NOT validate_redirect_url(app_id, redirect_url) THEN
    -- Log the error with helpful instructions
    PERFORM log_redirect_validation_error(app_id, redirect_url, user_agent, ip_address);
    
    -- Still raise the exception for the API to handle
    RAISE EXCEPTION 'Invalid redirect URL for application. Check audit_logs table for detailed instructions on how to configure allowed redirect URLs.';
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

-- Enhanced function to complete authentication session with membership information
CREATE OR REPLACE FUNCTION complete_auth_session_enhanced(
  session_token TEXT,
  authenticated_user_id UUID
)
RETURNS TABLE(
  application_id UUID,
  redirect_url TEXT,
  state JSONB,
  user_memberships JSONB
) AS $$
DECLARE
  session_record RECORD;
  memberships_json JSONB;
BEGIN
  -- Get and update the session
  UPDATE auth_sessions 
  SET 
    user_id = authenticated_user_id,
    status = 'completed',
    completed_at = CURRENT_TIMESTAMP
  WHERE 
    session_token = complete_auth_session_enhanced.session_token
    AND status = 'pending'
    AND expires_at > CURRENT_TIMESTAMP
  RETURNING * INTO session_record;
  
  -- If no session found or expired
  IF session_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session token';
  END IF;
  
  -- Get user memberships with pricing information
  SELECT jsonb_agg(
    jsonb_build_object(
      'application_id', gump.application_id,
      'application_name', gump.application_name,
      'application_slug', gump.application_slug,
      'membership', jsonb_build_object(
        'id', gump.membership_id,
        'status', gump.membership_status,
        'tier', jsonb_build_object(
          'id', gump.tier_id,
          'name', gump.tier_name,
          'level', gump.tier_level,
          'features', gump.tier_features
        ),
        'started_at', gump.started_at,
        'ends_at', gump.ends_at,
        'renewal_date', gump.renewal_date,
        'pricing', jsonb_build_object(
          'monthly_cents', gump.monthly_price_cents,
          'yearly_cents', gump.yearly_price_cents,
          'currency', gump.currency
        )
      )
    )
  ) INTO memberships_json
  FROM get_user_memberships_with_pricing(authenticated_user_id) gump;
  
  -- Return session details with membership information
  RETURN QUERY SELECT 
    session_record.application_id,
    session_record.redirect_url,
    session_record.state,
    COALESCE(memberships_json, '[]'::jsonb) as user_memberships;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_memberships_with_pricing(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_redirect_validation_error(UUID, TEXT, TEXT, INET) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_auth_session_enhanced(UUID, TEXT, TEXT, JSONB, INTEGER, TEXT, INET) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_auth_session_enhanced(TEXT, UUID) TO anon, authenticated;