-- Step 7: Create trigger to automatically queue embeddings after transcription

-- Create a trigger to automatically create embedding job when dream is transcribed
CREATE OR REPLACE FUNCTION create_embedding_job_on_transcription()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create job if transcription completed successfully
  IF NEW.transcription_status = 'completed' AND 
     OLD.transcription_status != 'completed' AND
     NEW.raw_transcript IS NOT NULL AND
     length(NEW.raw_transcript) >= 50 THEN
    
    -- Check if job already exists
    INSERT INTO embedding_jobs (dream_id, priority)
    VALUES (NEW.id, 0)
    ON CONFLICT (dream_id) DO NOTHING;
    
    -- Update dream embedding status
    UPDATE dreams 
    SET embedding_status = 'pending'
    WHERE id = NEW.id AND embedding_status IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_embedding_job ON dreams;
CREATE TRIGGER trigger_create_embedding_job
  AFTER UPDATE OF transcription_status ON dreams
  FOR EACH ROW
  EXECUTE FUNCTION create_embedding_job_on_transcription();