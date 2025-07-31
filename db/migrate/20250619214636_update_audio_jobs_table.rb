class UpdateAudioJobsTable < ActiveRecord::Migration[8.0]
  def change
    change_table :audio_jobs do |t|
      # Make user_id optional
      change_column_null :audio_jobs, :user_id, true
      
      # Add new required columns (only if they don't exist)
      add_column :audio_jobs, :language, :string unless column_exists?(:audio_jobs, :language)
      add_column :audio_jobs, :model, :string unless column_exists?(:audio_jobs, :model)
      add_column :audio_jobs, :progress, :float, default: 0 unless column_exists?(:audio_jobs, :progress)
      add_column :audio_jobs, :result, :text unless column_exists?(:audio_jobs, :result)
      add_column :audio_jobs, :error, :text unless column_exists?(:audio_jobs, :error)
      
      # Change status to integer for enum
      change_column :audio_jobs, :status, :integer, default: 0
      
      # Remove unused columns (only if they exist)
      remove_column :audio_jobs, :file_type if column_exists?(:audio_jobs, :file_type)
      remove_column :audio_jobs, :model_used if column_exists?(:audio_jobs, :model_used)
      remove_column :audio_jobs, :padding if column_exists?(:audio_jobs, :padding)
      remove_column :audio_jobs, :opt_in_storage if column_exists?(:audio_jobs, :opt_in_storage)
    end
  end
end
