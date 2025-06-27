require "application_system_test_case"

class AuthenticationTest < ApplicationSystemTestCase
  test "user can register and log in" do
    visit new_user_path
    fill_in "Email", with: "systemtest@example.com"
    fill_in "Password", with: "password123"
    fill_in "Password confirmation", with: "password123"
    click_on "Create Account"
    assert_text "Account created successfully"

    visit new_session_path
    fill_in "Email", with: "systemtest@example.com"
    fill_in "Password", with: "password123"
    click_on "Log In"
    assert_text "Logged in successfully"
  end

  test "navbar shows correct links when logged out" do
    visit root_path
    assert_selector "a", text: "Sign Up"
    assert_selector "a", text: "Sign In"
    assert_no_button "Sign Out"
  end

  test "navbar shows sign out when logged in" do
    User.create!(email: "navtest@example.com", password: "password123", password_confirmation: "password123")
    visit new_session_path
    fill_in "Email", with: "navtest@example.com"
    fill_in "Password", with: "password123"
    click_on "Log In"
    assert_selector "form button", text: "Sign Out"
    assert_no_selector "a", text: "Sign Up"
    assert_no_selector "a", text: "Sign In"
  end
end 