INSERT INTO problems (title, description, difficulty, languages)
VALUES 
(
    'Two Sum', 
    'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    'easy', 
    ARRAY['python', 'javascript', 'java', 'cpp', 'c']
),
(
    'Valid Parentheses',
    'Given a string `s` containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid. An input string is valid if open brackets must be closed by the same type of brackets, and in the correct order.',
    'easy',
    ARRAY['python', 'javascript', 'java', 'cpp']
),
(
    'LRU Cache',
    'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the `LRUCache` class with `get` and `put` methods. The cache is initialized with a positive capacity.',
    'medium',
    ARRAY['python', 'javascript', 'java', 'cpp', 'c']
),
(
    'Merge K Sorted Lists',
    'You are given an array of `k` linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.',
    'hard',
    ARRAY['python', 'java', 'cpp']
);
