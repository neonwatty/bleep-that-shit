require "test_helper"

class ViteTestControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get vite_test_index_url
    assert_response :success
  end
end
