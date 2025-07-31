require "test_helper"
require "rack/test"

class StoredMediumTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(email: 'stored@example.com', password: 'password')
    @audio_job = AudioJob.create!(language: 'en', model: 'whisper', status: 'pending', progress: 0.0, user: @user)
    @valid_attrs = {
      audio_job: @audio_job,
      user: @user,
      retention_period: 1.day.from_now
    }
  end

  test "valid StoredMedium" do
    media = StoredMedium.new(@valid_attrs)
    assert media.valid?
  end

  test "invalid without retention_period" do
    media = StoredMedium.new(@valid_attrs.merge(retention_period: nil))
    assert_not media.valid?
    assert_includes media.errors[:retention_period], "can't be blank"
  end

  test "belongs to audio_job" do
    media = StoredMedium.new(@valid_attrs)
    assert_equal @audio_job, media.audio_job
  end

  test "expired? returns false if retention_period is in the future" do
    media = StoredMedium.new(@valid_attrs)
    assert_not media.expired?
  end

  test "expired? returns true if retention_period is in the past" do
    media = StoredMedium.new(@valid_attrs.merge(retention_period: 1.day.ago))
    assert media.expired?
  end

  test "has one attached media_file" do
    media = StoredMedium.new(@valid_attrs)
    assert_respond_to media, :media_file
  end

  test "can attach a file using ActiveStorage" do
    media = StoredMedium.create!(@valid_attrs)
    file = Rack::Test::UploadedFile.new(Rails.root.join('test/fixtures/files/sample.txt'), 'text/plain')
    media.media_file.attach(file)
    assert media.media_file.attached?
    assert_equal 'sample.txt', media.media_file.filename.to_s
  end
end
