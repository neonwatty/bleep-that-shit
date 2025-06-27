class UpdateAudioJobsTable < ActiveRecord::Migration[8.0]
  def change
    change_table :audio_jobs do |t|
      # Make user_id optional
      change_column_null :audio_jobs, :user_id, true
      
      # Add new required columns
      add_column :audio_jobs, :language, :string
      add_column :audio_jobs, :model, :string
      add_column :audio_jobs, :progress, :float, default: 0
      add_column :audio_jobs, :result, :text
      add_column :audio_jobs, :error, :text
      
      # Change status to integer for enum
      change_column :audio_jobs, :status, :integer, default: 0
      
      # Remove unused columns
      remove_column :audio_jobs, :file_type
      remove_column :audio_jobs, :model_used
      remove_column :audio_jobs, :padding
      remove_column :audio_jobs, :opt_in_storage
    end
  end
end
