class AudioJob < ApplicationRecord
  belongs_to :user, optional: true
  has_many :stored_media, dependent: :destroy

  enum :status, {
    pending: 0,
    processing: 1,
    completed: 2,
    failed: 3
  }

  validates :language, presence: true
  validates :model, presence: true
  validates :progress, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }, allow_nil: true

  scope :recent, -> { order(created_at: :desc) }
  scope :by_status, ->(status) { where(status: status) }
end 