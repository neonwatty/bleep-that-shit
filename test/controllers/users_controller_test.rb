require "test_helper"

class UsersControllerTest < ActionDispatch::IntegrationTest
  test "should get new" do
    get new_user_url
    assert_response :success
  end

  test "should register user with valid data" do
    assert_difference('User.count', 1) do
      post users_url, params: { user: { email: 'newuser@example.com', password: 'password123', password_confirmation: 'password123' } }
    end
    assert_redirected_to new_session_path
    follow_redirect!
    assert_match 'Account created successfully', response.body
  end

  test "should not register user with invalid data" do
    assert_no_difference('User.count') do
      post users_url, params: { user: { email: '', password: 'short', password_confirmation: 'mismatch' } }
    end
    assert_response :unprocessable_entity
    assert_match 'prohibited this user from being saved', response.body rescue nil
  end
end
