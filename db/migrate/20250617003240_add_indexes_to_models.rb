class AddIndexesToModels < ActiveRecord::Migration[7.0]
  def change
    add_index :audio_jobs, :user_id unless index_exists?(:audio_jobs, :user_id)
    add_index :audio_jobs, :status unless index_exists?(:audio_jobs, :status)
    add_index :bleep_configs, :user_id unless index_exists?(:bleep_configs, :user_id)
    add_index :stored_media, :audio_job_id unless index_exists?(:stored_media, :audio_job_id)
    add_index :stored_media, :retention_period unless index_exists?(:stored_media, :retention_period)
    add_index :stored_media, :user_id unless index_exists?(:stored_media, :user_id)
    add_foreign_key :stored_media, :users unless foreign_key_exists?(:stored_media, :users)
  end
end
