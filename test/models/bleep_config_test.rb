require "test_helper"

class BleepConfigTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(email: 'bleep@example.com', password: 'password')
    @valid_attrs = {
      name: 'Default',
      bleep_sound: 'beep.mp3',
      pre_padding: 0.5,
      post_padding: 0.5,
      user: @user
    }
  end

  test "valid BleepConfig" do
    config = BleepConfig.new(@valid_attrs)
    assert config.valid?
  end

  test "invalid without name" do
    config = BleepConfig.new(@valid_attrs.merge(name: nil))
    assert_not config.valid?
    assert_includes config.errors[:name], "can't be blank"
  end

  test "invalid without bleep_sound" do
    config = BleepConfig.new(@valid_attrs.merge(bleep_sound: nil))
    assert_not config.valid?
    assert_includes config.errors[:bleep_sound], "can't be blank"
  end

  test "invalid with negative pre_padding" do
    config = BleepConfig.new(@valid_attrs.merge(pre_padding: -1))
    assert_not config.valid?
    assert_includes config.errors[:pre_padding], "must be greater than or equal to 0"
  end

  test "invalid with pre_padding greater than 5" do
    config = BleepConfig.new(@valid_attrs.merge(pre_padding: 6))
    assert_not config.valid?
    assert_includes config.errors[:pre_padding], "must be less than or equal to 5"
  end

  test "invalid with negative post_padding" do
    config = BleepConfig.new(@valid_attrs.merge(post_padding: -1))
    assert_not config.valid?
    assert_includes config.errors[:post_padding], "must be greater than or equal to 0"
  end

  test "invalid with post_padding greater than 5" do
    config = BleepConfig.new(@valid_attrs.merge(post_padding: 6))
    assert_not config.valid?
    assert_includes config.errors[:post_padding], "must be less than or equal to 5"
  end

  test "belongs to user" do
    config = BleepConfig.new(@valid_attrs)
    assert_equal @user, config.user
  end
end
