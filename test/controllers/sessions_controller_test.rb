require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
  end

  test "should get new" do
    get new_session_url
    assert_response :success
  end

  test "should log in with valid credentials" do
    post sessions_url, params: { session: { email: @user.email, password: 'password123' } }
    assert_redirected_to root_path
    follow_redirect!
    assert_match 'Logged in successfully', response.body
    assert_equal @user.id, session[:user_id]
  end

  test "should not log in with invalid credentials" do
    post sessions_url, params: { session: { email: @user.email, password: 'wrongpass' } }
    assert_response :unprocessable_entity
    assert_match 'Invalid email or password', response.body
    assert_nil session[:user_id]
  end

  test "should log out" do
    # Log in first
    post sessions_url, params: { session: { email: @user.email, password: 'password123' } }
    assert_equal @user.id, session[:user_id]
    delete session_url(@user)
    assert_redirected_to new_session_path
    follow_redirect!
    assert_match 'Logged out successfully', response.body
    assert_nil session[:user_id]
  end
end
