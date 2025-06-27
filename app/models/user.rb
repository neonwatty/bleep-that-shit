class User < ApplicationRecord
  has_many :audio_jobs, dependent: :nullify
  has_many :bleep_configs, dependent: :destroy

  has_secure_password
  validates :email, presence: true, uniqueness: true
end
