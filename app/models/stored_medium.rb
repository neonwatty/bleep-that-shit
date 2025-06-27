class StoredMedium < ApplicationRecord
  belongs_to :audio_job
  belongs_to :user
  has_one_attached :media_file

  validates :retention_period, presence: true

  # Returns true if the media is expired
  def expired?
    retention_period.present? && Time.current > retention_period
  end
end
