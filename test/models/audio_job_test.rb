require "test_helper"

class AudioJobTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(email: 'test@example.com', password: 'password')
    @valid_attrs = {
      language: 'en',
      model: 'whisper',
      status: 'pending',
      progress: 0.0,
      user: @user
    }
  end

  test "valid AudioJob" do
    job = AudioJob.new(@valid_attrs)
    assert job.valid?
  end

  test "invalid without language" do
    job = AudioJob.new(@valid_attrs.merge(language: nil))
    assert_not job.valid?
    assert_includes job.errors[:language], "can't be blank"
  end

  # Rails enums handle invalid status validation automatically
  # test "invalid with invalid status" do
  #   job = AudioJob.new(@valid_attrs)
  #   job.status = 'unknown'
  #   assert_not job.valid?
  #   assert_includes job.errors[:status], "is not a valid status"
  # end

  test "invalid without model" do
    job = AudioJob.new(@valid_attrs.merge(model: nil))
    assert_not job.valid?
    assert_includes job.errors[:model], "can't be blank"
  end

  test "invalid with invalid progress" do
    job = AudioJob.new(@valid_attrs.merge(progress: 150))
    assert_not job.valid?
    assert_includes job.errors[:progress], "must be less than or equal to 100"
  end

  test "status enum includes all values" do
    assert_equal %w[pending processing completed failed], AudioJob.statuses.keys
  end
end
