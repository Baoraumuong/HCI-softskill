INSERT INTO testcases (problem_id, input, output, is_sample)
VALUES 
-- ==========================================
-- Problem: Two Sum
-- Format: First line is array, second line is target
-- ==========================================
(
    (SELECT problem_id FROM problems WHERE title = 'Two Sum' LIMIT 1),
    '[2,7,11,15]\n9',
    '[0,1]',
    true
),
(
    (SELECT problem_id FROM problems WHERE title = 'Two Sum' LIMIT 1),
    '[3,2,4]\n6',
    '[1,2]',
    true
),
(
    (SELECT problem_id FROM problems WHERE title = 'Two Sum' LIMIT 1),
    '[3,3]\n6',
    '[0,1]',
    false -- Hidden edge case (duplicates)
),

-- ==========================================
-- Problem: Valid Parentheses
-- Format: Single string input
-- ==========================================
(
    (SELECT problem_id FROM problems WHERE title = 'Valid Parentheses' LIMIT 1),
    '()',
    'true',
    true
),
(
    (SELECT problem_id FROM problems WHERE title = 'Valid Parentheses' LIMIT 1),
    '()[]{}',
    'true',
    true
),
(
    (SELECT problem_id FROM problems WHERE title = 'Valid Parentheses' LIMIT 1),
    '(]',
    'false',
    true
),
(
    (SELECT problem_id FROM problems WHERE title = 'Valid Parentheses' LIMIT 1),
    '([)]',
    'false',
    false -- Hidden edge case (interleaved)
),
(
    (SELECT problem_id FROM problems WHERE title = 'Valid Parentheses' LIMIT 1),
    '{[]}',
    'true',
    false -- Hidden edge case (nested)
),

-- ==========================================
-- Problem: LRU Cache
-- Format: Line 1 = methods, Line 2 = arguments (JSON format)
-- ==========================================
(
    (SELECT problem_id FROM problems WHERE title = 'LRU Cache' LIMIT 1),
    '["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]',
    '[null, null, null, 1, null, -1, null, -1, 3, 4]',
    true
),
(
    (SELECT problem_id FROM problems WHERE title = 'LRU Cache' LIMIT 1),
    '["LRUCache", "put", "get", "put", "get", "get"]\n[[1], [2, 1], [2], [3, 2], [2], [3]]',
    '[null, null, 1, null, -1, 2]',
    false -- Hidden edge case (cache capacity of 1)
),

-- ==========================================
-- Problem: Merge K Sorted Lists
-- Format: Array of arrays
-- ==========================================
(
    (SELECT problem_id FROM problems WHERE title = 'Merge K Sorted Lists' LIMIT 1),
    '[[1,4,5],[1,3,4],[2,6]]',
    '[1,1,2,3,4,4,5,6]',
    true
),
(
    (SELECT problem_id FROM problems WHERE title = 'Merge K Sorted Lists' LIMIT 1),
    '[]',
    '[]',
    true
),
(
    (SELECT problem_id FROM problems WHERE title = 'Merge K Sorted Lists' LIMIT 1),
    '[[]]',
    '[]',
    false -- Hidden edge case (array containing empty array)
);