require "test_helper"

class AudioJobTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(email: 'test@example.com', password: 'password')
    @valid_attrs = {
      file_type: 'mp3',
      status: 'pending',
      model_used: 'whisper',
      padding: 0.5,
      opt_in_storage: true,
      user: @user
    }
  end

  test "valid AudioJob" do
    job = AudioJob.new(@valid_attrs)
    assert job.valid?
  end

  test "invalid without file_type" do
    job = AudioJob.new(@valid_attrs.merge(file_type: nil))
    assert_not job.valid?
    assert_includes job.errors[:file_type], "can't be blank"
  end

  test "invalid with invalid status" do
    job = AudioJob.new(@valid_attrs.merge(status: 'unknown'))
    assert_not job.valid?
    assert_includes job.errors[:status], "is not included in the list"
  end

  test "invalid without model_used" do
    job = AudioJob.new(@valid_attrs.merge(model_used: nil))
    assert_not job.valid?
    assert_includes job.errors[:model_used], "can't be blank"
  end

  test "invalid with non-numeric padding" do
    job = AudioJob.new(@valid_attrs.merge(padding: 'abc'))
    assert_not job.valid?
    assert_includes job.errors[:padding], "is not a number"
  end

  test "invalid without opt_in_storage" do
    job = AudioJob.new(@valid_attrs.merge(opt_in_storage: nil))
    assert_not job.valid?
    assert_includes job.errors[:opt_in_storage], "is not included in the list"
  end

  test "status constant includes all values" do
    assert_equal %w[pending processing completed failed], AudioJob::STATUSES
  end
end
