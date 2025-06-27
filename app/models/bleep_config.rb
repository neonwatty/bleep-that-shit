class BleepConfig < ApplicationRecord
  belongs_to :user

  validates :name, presence: true
  validates :bleep_sound, presence: true
  validates :pre_padding, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 5 }
  validates :post_padding, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 5 }
end
