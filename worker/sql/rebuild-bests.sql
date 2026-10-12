DELETE FROM bests;
INSERT INTO bests (install_id, run_id, pellets, reach, country, received_at)
SELECT install_id, id, pellets, reach, country, received_at
FROM (
  SELECT
    install_id, id, pellets, country, received_at,
    CASE WHEN outcome = 'complete' THEN 10 ELSE MIN(final_level, 9) END AS reach,
    ROW_NUMBER() OVER (
      PARTITION BY install_id
      ORDER BY pellets DESC, CASE WHEN outcome = 'complete' THEN 10 ELSE MIN(final_level, 9) END DESC, received_at ASC
    ) AS place
  FROM runs
  WHERE hidden_reason IS NULL AND outcome IN ('death', 'complete')
)
WHERE place = 1;
