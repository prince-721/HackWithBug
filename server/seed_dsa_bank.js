// server/seed_dsa_bank.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('./db');

const DSA_PROBLEMS = [
  // ─── 1. ARRAYS & TWO POINTERS ─────────────────────────────────────────────
  {
    title: 'Two Sum',
    difficulty: 'easy',
    points: 100,
    tags: ['Arrays', 'Two Pointers', 'Hashing'],
    statement: 'Given an array of integers `nums` and an integer `target`, return the 0-based indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    inputFormat: 'First line contains integer N (size of array).\nSecond line contains N space-separated integers.\nThird line contains integer target.',
    outputFormat: 'Print the two 0-based indices separated by a space in ascending order.',
    constraints: '2 <= N <= 10^5\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
    sampleInput: '4\n2 7 11 15\n9',
    sampleOutput: '0 1',
    explanation: 'nums[0] + nums[1] = 2 + 7 = 9. So the indices are 0 and 1.',
    testCases: [
      { type: 'sample', input: '4\n2 7 11 15\n9', output: '0 1' },
      { type: 'sample', input: '3\n3 2 4\n6', output: '1 2' }
    ],
    hiddenTestCases: [
      { input: '2\n3 3\n6', output: '0 1' },
      { input: '5\n1 5 3 7 9\n12', output: '1 3' },
      { input: '4\n-3 4 3 90\n0', output: '0 2' }
    ],
    editorial: 'Use a hash map to store seen values and their indices. For each element x, check if (target - x) is in the map. Time Complexity: O(N), Space Complexity: O(N).'
  },
  {
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'easy',
    points: 100,
    tags: ['Arrays', 'Dynamic Programming'],
    statement: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve. If you cannot achieve any profit, return 0.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers representing prices.',
    outputFormat: 'Print the maximum profit integer.',
    constraints: '1 <= N <= 10^5\n0 <= prices[i] <= 10^4',
    sampleInput: '6\n7 1 5 3 6 4',
    sampleOutput: '5',
    explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.',
    testCases: [
      { type: 'sample', input: '6\n7 1 5 3 6 4', output: '5' },
      { type: 'sample', input: '5\n7 6 4 3 1', output: '0' }
    ],
    hiddenTestCases: [
      { input: '1\n100', output: '0' },
      { input: '4\n2 4 1 7', output: '6' },
      { input: '5\n3 2 6 5 0', output: '4' }
    ],
    editorial: 'Keep track of the minimum price seen so far and update the maximum profit at each step. Time Complexity: O(N), Space: O(1).'
  },
  {
    title: 'Maximum Subarray (Kadane\'s Algorithm)',
    difficulty: 'medium',
    points: 200,
    tags: ['Arrays', 'Dynamic Programming', 'Divide and Conquer'],
    statement: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the maximum subarray sum.',
    constraints: '1 <= N <= 10^5\n-10^4 <= nums[i] <= 10^4',
    sampleInput: '9\n-2 1 -3 4 -1 2 1 -5 4',
    sampleOutput: '6',
    explanation: 'The subarray [4, -1, 2, 1] has the largest sum = 6.',
    testCases: [
      { type: 'sample', input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6' },
      { type: 'sample', input: '1\n1', output: '1' }
    ],
    hiddenTestCases: [
      { input: '5\n5 4 -1 7 8', output: '23' },
      { input: '4\n-4 -3 -2 -1', output: '-1' }
    ],
    editorial: 'Use Kadane\'s Algorithm: current_sum = max(num, current_sum + num) and max_sum = max(max_sum, current_sum). Time: O(N), Space: O(1).'
  },
  {
    title: 'Container With Most Water',
    difficulty: 'medium',
    points: 200,
    tags: ['Arrays', 'Two Pointers', 'Greedy'],
    statement: 'You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i-th` line are `(i, 0)` and `(i, height[i])`. Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print a single integer representing maximum water capacity.',
    constraints: '2 <= N <= 10^5\n0 <= height[i] <= 10^4',
    sampleInput: '9\n1 8 6 2 5 4 8 3 7',
    sampleOutput: '49',
    explanation: 'Lines at index 1 (height 8) and index 8 (height 7) form a container with width 7 and height min(8,7)=7, area = 49.',
    testCases: [
      { type: 'sample', input: '9\n1 8 6 2 5 4 8 3 7', output: '49' },
      { type: 'sample', input: '2\n1 1', output: '1' }
    ],
    hiddenTestCases: [
      { input: '4\n4 3 2 14', output: '12' },
      { input: '5\n1 2 1 2 1', output: '4' }
    ],
    editorial: 'Two pointers at left and right ends. Compute area = (right - left) * min(h[left], h[right]). Move the pointer with the smaller height inward. Time: O(N), Space: O(1).'
  },
  {
    title: '3Sum',
    difficulty: 'medium',
    points: 200,
    tags: ['Arrays', 'Two Pointers', 'Sorting'],
    statement: 'Given an integer array nums, return the number of distinct triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the count of unique triplets that sum to 0.',
    constraints: '3 <= N <= 3000\n-10^5 <= nums[i] <= 10^5',
    sampleInput: '6\n-1 0 1 2 -1 -4',
    sampleOutput: '2',
    explanation: 'The unique triplets are [-1, 0, 1] and [-1, -1, 2]. Count = 2.',
    testCases: [
      { type: 'sample', input: '6\n-1 0 1 2 -1 -4', output: '2' },
      { type: 'sample', input: '3\n0 1 1', output: '0' }
    ],
    hiddenTestCases: [
      { input: '3\n0 0 0', output: '1' },
      { input: '7\n-2 0 1 1 2 -1 -4', output: '4' }
    ],
    editorial: 'Sort the array. Fix the first element with index i, then use two pointers (left and right) to find pairs that sum to -nums[i]. Skip duplicates. Time: O(N^2), Space: O(1).'
  },
  {
    title: 'Trapping Rain Water',
    difficulty: 'hard',
    points: 300,
    tags: ['Arrays', 'Two Pointers', 'Dynamic Programming', 'Stack'],
    statement: 'Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers representing elevation heights.',
    outputFormat: 'Print the total units of trapped rain water.',
    constraints: '1 <= N <= 2 * 10^5\n0 <= height[i] <= 10^5',
    sampleInput: '12\n0 1 0 2 1 0 1 3 2 1 2 1',
    sampleOutput: '6',
    explanation: 'The elevation map traps 6 units of rain water.',
    testCases: [
      { type: 'sample', input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', output: '6' },
      { type: 'sample', input: '6\n4 2 0 3 2 5', output: '9' }
    ],
    hiddenTestCases: [
      { input: '3\n3 0 3', output: '3' },
      { input: '5\n1 2 3 4 5', output: '0' }
    ],
    editorial: 'Use two pointers `left` and `right` with `left_max` and `right_max`. Water trapped at index depends on min(left_max, right_max) - height. Time: O(N), Space: O(1).'
  },
  {
    title: 'Product of Array Except Self',
    difficulty: 'medium',
    points: 200,
    tags: ['Arrays', 'Prefix Sum'],
    statement: 'Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer. You must write an algorithm that runs in O(n) time and without using the division operation.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print N space-separated integers representing the answer array.',
    constraints: '2 <= N <= 10^5\n-30 <= nums[i] <= 30',
    sampleInput: '4\n1 2 3 4',
    sampleOutput: '24 12 8 6',
    explanation: 'For index 0: 2*3*4 = 24. Index 1: 1*3*4 = 12. Index 2: 1*2*4 = 8. Index 3: 1*2*3 = 6.',
    testCases: [
      { type: 'sample', input: '4\n1 2 3 4', output: '24 12 8 6' },
      { type: 'sample', input: '5\n-1 1 0 -3 3', output: '0 0 9 0 0' }
    ],
    hiddenTestCases: [
      { input: '2\n5 10', output: '10 5' },
      { input: '3\n2 3 4', output: '12 8 6' }
    ],
    editorial: 'Build prefix products array in forward pass, then multiply suffix products in backward pass. Time: O(N), Space: O(1) auxiliary.'
  },
  {
    title: 'Rotate Image (Matrix Rotation)',
    difficulty: 'medium',
    points: 200,
    tags: ['Arrays', 'Matrix', 'Math'],
    statement: 'You are given an `n x n` 2D matrix representing an image, rotate the image by 90 degrees clockwise in-place.',
    inputFormat: 'First line contains integer N (dimension of matrix).\nNext N lines contain N space-separated integers each.',
    outputFormat: 'Print N lines with N space-separated integers representing the rotated matrix.',
    constraints: '1 <= N <= 500\n-1000 <= matrix[i][j] <= 1000',
    sampleInput: '3\n1 2 3\n4 5 6\n7 8 9',
    sampleOutput: '7 4 1\n8 5 2\n9 6 3',
    explanation: 'Transposing the matrix and reversing each row rotates it 90 degrees clockwise.',
    testCases: [
      { type: 'sample', input: '3\n1 2 3\n4 5 6\n7 8 9', output: '7 4 1\n8 5 2\n9 6 3' },
      { type: 'sample', input: '2\n1 2\n3 4', output: '3 1\n4 2' }
    ],
    hiddenTestCases: [
      { input: '1\n42', output: '42' }
    ],
    editorial: 'First transpose the matrix (swap matrix[i][j] with matrix[j][i]), then reverse each row. Time: O(N^2), Space: O(1).'
  },
  {
    title: 'Spiral Matrix',
    difficulty: 'medium',
    points: 200,
    tags: ['Arrays', 'Matrix', 'Simulation'],
    statement: 'Given an `m x n` matrix, return all elements of the matrix in spiral order.',
    inputFormat: 'First line contains two integers R and C (rows and columns).\nNext R lines contain C space-separated integers each.',
    outputFormat: 'Print all matrix elements in spiral order separated by a space.',
    constraints: '1 <= R, C <= 100\n-100 <= matrix[i][j] <= 100',
    sampleInput: '3 3\n1 2 3\n4 5 6\n7 8 9',
    sampleOutput: '1 2 3 6 9 8 7 4 5',
    explanation: 'Traversing the outer boundaries clockwise yields 1 2 3 6 9 8 7 4 5.',
    testCases: [
      { type: 'sample', input: '3 3\n1 2 3\n4 5 6\n7 8 9', output: '1 2 3 6 9 8 7 4 5' },
      { type: 'sample', input: '3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12', output: '1 2 3 4 8 12 11 10 9 5 6 7' }
    ],
    hiddenTestCases: [
      { input: '1 1\n7', output: '7' },
      { input: '2 1\n1\n2', output: '1 2' }
    ],
    editorial: 'Maintain four boundary pointers: top, bottom, left, right. Traverse right across top, down along right, left along bottom, and up along left. Time: O(R*C), Space: O(1).'
  },

  // ─── 2. STRINGS & SLIDING WINDOW ──────────────────────────────────────────
  {
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    points: 200,
    tags: ['Strings', 'Sliding Window', 'Hashing'],
    statement: 'Given a string `s`, find the length of the longest substring without repeating characters.',
    inputFormat: 'Single line containing string s.',
    outputFormat: 'Print the length of the longest non-repeating substring as an integer.',
    constraints: '0 <= s.length <= 5 * 10^4',
    sampleInput: 'abcabcbb',
    sampleOutput: '3',
    explanation: 'The answer is "abc", with the length of 3.',
    testCases: [
      { type: 'sample', input: 'abcabcbb', output: '3' },
      { type: 'sample', input: 'bbbbb', output: '1' }
    ],
    hiddenTestCases: [
      { input: 'pwwkew', output: '3' },
      { input: 'a', output: '1' },
      { input: 'au', output: '2' }
    ],
    editorial: 'Use a sliding window with two pointers and a hash map/set of character positions. When a duplicate is seen, slide left pointer past the previous occurrence. Time: O(N), Space: O(min(N, charset)).'
  },
  {
    title: 'Valid Anagram',
    difficulty: 'easy',
    points: 100,
    tags: ['Strings', 'Hashing', 'Sorting'],
    statement: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise. An Anagram is a word formed by rearranging the letters of a different word, using all the original letters exactly once.',
    inputFormat: 'First line contains string s.\nSecond line contains string t.',
    outputFormat: 'Print "true" if anagram, otherwise "false".',
    constraints: '1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.',
    sampleInput: 'anagram\nnagaram',
    sampleOutput: 'true',
    explanation: 'Both words contain 3 a\'s, 1 g, 1 m, 1 n, and 1 r.',
    testCases: [
      { type: 'sample', input: 'anagram\nnagaram', output: 'true' },
      { type: 'sample', input: 'rat\ncar', output: 'false' }
    ],
    hiddenTestCases: [
      { input: 'a\na', output: 'true' },
      { input: 'ab\na', output: 'false' }
    ],
    editorial: 'Count frequency of characters in an array of size 26. Increment for s and decrement for t. Check if all counts are 0. Time: O(N), Space: O(1).'
  },
  {
    title: 'Group Anagrams',
    difficulty: 'medium',
    points: 200,
    tags: ['Strings', 'Hashing', 'Sorting'],
    statement: 'Given an array of strings `strs`, return the number of distinct anagram groups.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated words.',
    outputFormat: 'Print an integer representing the number of anagram groups.',
    constraints: '1 <= N <= 10^4\n0 <= strs[i].length <= 100',
    sampleInput: '6\neat tea tan ate nat bat',
    sampleOutput: '3',
    explanation: 'The 3 groups are: ["bat"], ["nat","tan"], and ["ate","eat","tea"].',
    testCases: [
      { type: 'sample', input: '6\neat tea tan ate nat bat', output: '3' },
      { type: 'sample', input: '1\na', output: '1' }
    ],
    hiddenTestCases: [
      { input: '3\na b c', output: '3' },
      { input: '4\nab ba cd dc', output: '2' }
    ],
    editorial: 'For each string, sort its characters (or use character frequency tuple) as a hash map key. The number of unique keys equals the number of groups. Time: O(N * K log K), Space: O(N*K).'
  },
  {
    title: 'Minimum Window Substring',
    difficulty: 'hard',
    points: 300,
    tags: ['Strings', 'Sliding Window', 'Hashing'],
    statement: 'Given two strings `s` and `t` of lengths `m` and `n` respectively, return the minimum window substring of `s` such that every character in `t` (including duplicates) is included in the window. If there is no such substring, return an empty string "".',
    inputFormat: 'First line contains string s.\nSecond line contains string t.',
    outputFormat: 'Print the minimum window substring (or empty string).',
    constraints: '1 <= m, n <= 10^5\ns and t consist of uppercase and lowercase English letters.',
    sampleInput: 'ADOBECODEBANC\nABC',
    sampleOutput: 'BANC',
    explanation: 'The minimum window substring "BANC" includes \'A\', \'B\', and \'C\' from string t.',
    testCases: [
      { type: 'sample', input: 'ADOBECODEBANC\nABC', output: 'BANC' },
      { type: 'sample', input: 'a\na', output: 'a' }
    ],
    hiddenTestCases: [
      { input: 'a\naa', output: '' },
      { input: 'ab\nb', output: 'b' }
    ],
    editorial: 'Use sliding window with two pointers and a character count map. Expand right pointer until window is valid, then shrink left pointer to find the minimal window. Time: O(M + N), Space: O(charset).'
  },
  {
    title: 'Longest Palindromic Substring',
    difficulty: 'medium',
    points: 200,
    tags: ['Strings', 'Dynamic Programming', 'Two Pointers'],
    statement: 'Given a string `s`, return the length of the longest palindromic substring in `s`.',
    inputFormat: 'Single line containing string s.',
    outputFormat: 'Print the maximum integer length of any palindromic substring.',
    constraints: '1 <= s.length <= 1000\ns consist of only digits and English letters.',
    sampleInput: 'babad',
    sampleOutput: '3',
    explanation: '"bab" and "aba" are both valid palindromes of length 3.',
    testCases: [
      { type: 'sample', input: 'babad', output: '3' },
      { type: 'sample', input: 'cbbd', output: '2' }
    ],
    hiddenTestCases: [
      { input: 'a', output: '1' },
      { input: 'racecar', output: '7' }
    ],
    editorial: 'Expand around center for all 2N - 1 centers (single character and two characters). Track the maximum length found. Time: O(N^2), Space: O(1).'
  },

  // ─── 3. LINKED LISTS ──────────────────────────────────────────────────────
  {
    title: 'Reverse Linked List',
    difficulty: 'easy',
    points: 100,
    tags: ['Linked Lists', 'Recursion'],
    statement: 'Given the head of a singly linked list with N elements, reverse the list, and return the reversed list elements.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers representing linked list nodes.',
    outputFormat: 'Print the reversed node values separated by a space.',
    constraints: '0 <= N <= 5000\n-5000 <= Node.val <= 5000',
    sampleInput: '5\n1 2 3 4 5',
    sampleOutput: '5 4 3 2 1',
    explanation: 'Reversing 1->2->3->4->5 yields 5->4->3->2->1.',
    testCases: [
      { type: 'sample', input: '5\n1 2 3 4 5', output: '5 4 3 2 1' },
      { type: 'sample', input: '2\n1 2', output: '2 1' }
    ],
    hiddenTestCases: [
      { input: '1\n10', output: '10' },
      { input: '3\n7 8 9', output: '9 8 7' }
    ],
    editorial: 'Maintain three pointers: prev, curr, next. In each step, curr.next = prev, prev = curr, curr = next. Time: O(N), Space: O(1).'
  },
  {
    title: 'Merge Two Sorted Lists',
    difficulty: 'easy',
    points: 100,
    tags: ['Linked Lists', 'Two Pointers'],
    statement: 'You are given the heads of two sorted linked lists `list1` and `list2`. Merge the two lists into one sorted list by splicing together the nodes of the first two lists.',
    inputFormat: 'First line contains N and M (sizes of list1 and list2).\nSecond line contains N sorted integers for list1.\nThird line contains M sorted integers for list2.',
    outputFormat: 'Print the merged sorted list elements separated by a space.',
    constraints: '0 <= N, M <= 500\n-100 <= Node.val <= 100',
    sampleInput: '3 3\n1 2 4\n1 3 4',
    sampleOutput: '1 1 2 3 4 4',
    explanation: 'Merging [1,2,4] and [1,3,4] in non-decreasing order gives [1,1,2,3,4,4].',
    testCases: [
      { type: 'sample', input: '3 3\n1 2 4\n1 3 4', output: '1 1 2 3 4 4' },
      { type: 'sample', input: '0 1\n\n0', output: '0' }
    ],
    hiddenTestCases: [
      { input: '2 2\n2 5\n1 3', output: '1 2 3 5' }
    ],
    editorial: 'Use a dummy head node. Compare list1.val and list2.val, attach the smaller node to tail, advance that list pointer. Time: O(N + M), Space: O(1).'
  },
  {
    title: 'Linked List Cycle Detection',
    difficulty: 'easy',
    points: 100,
    tags: ['Linked Lists', 'Two Pointers'],
    statement: 'Given head, the head of a linked list, determine if the linked list has a cycle in it. There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer. Return "true" if there is a cycle, otherwise "false".',
    inputFormat: 'First line contains integer N.\nSecond line contains N node values.\nThird line contains pos (-1 if no cycle, or 0-based index where tail connects).',
    outputFormat: 'Print "true" if cycle exists, else "false".',
    constraints: '0 <= N <= 10^4\npos is -1 or a valid index in the linked-list.',
    sampleInput: '4\n3 2 0 -4\n1',
    sampleOutput: 'true',
    explanation: 'Tail connects to node index 1, forming a cycle.',
    testCases: [
      { type: 'sample', input: '4\n3 2 0 -4\n1', output: 'true' },
      { type: 'sample', input: '1\n1\n-1', output: 'false' }
    ],
    hiddenTestCases: [
      { input: '2\n1 2\n0', output: 'true' },
      { input: '2\n1 2\n-1', output: 'false' }
    ],
    editorial: 'Floyd\'s Tortoise and Hare Algorithm: Use slow pointer (1 step) and fast pointer (2 steps). If they meet, a cycle exists. Time: O(N), Space: O(1).'
  },
  {
    title: 'LRU Cache',
    difficulty: 'medium',
    points: 200,
    tags: ['Linked Lists', 'Design', 'Hashing'],
    statement: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Process a series of GET and PUT operations and return the results.',
    inputFormat: 'First line contains capacity C and number of operations Q.\nNext Q lines contain operations: "PUT key value" or "GET key".',
    outputFormat: 'Print output of each GET operation separated by a space (-1 if key not found).',
    constraints: '1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5\nUp to 2 * 10^5 calls to get and put.',
    sampleInput: '2 6\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3',
    sampleOutput: '1 -1 3',
    explanation: 'PUT 1=1, 2=2. GET 1 returns 1. PUT 3 evicts key 2 (LRU). GET 2 returns -1. GET 3 returns 3.',
    testCases: [
      { type: 'sample', input: '2 6\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nGET 3', output: '1 -1 3' }
    ],
    hiddenTestCases: [
      { input: '1 3\nPUT 2 1\nGET 2\nGET 1', output: '1 -1' }
    ],
    editorial: 'Combine a Doubly Linked List with a Hash Map. Hash map stores key -> Node. Move accessed node to head of DLL. Evict from tail when capacity is exceeded. Time: O(1) for GET/PUT, Space: O(C).'
  },

  // ─── 4. STACKS & QUEUES ───────────────────────────────────────────────────
  {
    title: 'Valid Parentheses',
    difficulty: 'easy',
    points: 100,
    tags: ['Stacks', 'Strings'],
    statement: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets and in the correct order.',
    inputFormat: 'Single line containing string s.',
    outputFormat: 'Print "true" if valid, otherwise "false".',
    constraints: '1 <= s.length <= 10^4',
    sampleInput: '()[]{}',
    sampleOutput: 'true',
    explanation: 'All brackets match correctly in order.',
    testCases: [
      { type: 'sample', input: '()[]{}', output: 'true' },
      { type: 'sample', input: '(]', output: 'false' }
    ],
    hiddenTestCases: [
      { input: '([)]', output: 'false' },
      { input: '{[]}', output: 'true' },
      { input: '(', output: 'false' }
    ],
    editorial: 'Push opening brackets to stack. For closing brackets, pop and verify matching type. Stack must be empty at the end. Time: O(N), Space: O(N).'
  },
  {
    title: 'Daily Temperatures',
    difficulty: 'medium',
    points: 200,
    tags: ['Stacks', 'Monotonic Stack', 'Arrays'],
    statement: 'Given an array of integers `temperatures` represents the daily temperatures, return an array `answer` such that `answer[i]` is the number of days you have to wait after the `i-th` day to get a warmer temperature. If there is no future day for which this is possible, keep `answer[i] == 0` instead.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print N space-separated integers representing the answer.',
    constraints: '1 <= N <= 10^5\n30 <= temperatures[i] <= 100',
    sampleInput: '8\n73 74 75 71 69 72 76 73',
    sampleOutput: '1 1 4 2 1 1 0 0',
    explanation: 'Day 0 (73): Day 1 is warmer (1 day). Day 2 (75): Day 6 (76) is warmer (4 days).',
    testCases: [
      { type: 'sample', input: '8\n73 74 75 71 69 72 76 73', output: '1 1 4 2 1 1 0 0' },
      { type: 'sample', input: '4\n30 40 50 60', output: '1 1 1 0' }
    ],
    hiddenTestCases: [
      { input: '3\n30 60 90', output: '1 1 0' },
      { input: '3\n90 80 70', output: '0 0 0' }
    ],
    editorial: 'Use a monotonic decreasing stack storing indices. When current temperature is higher than stack top, pop and calculate index difference. Time: O(N), Space: O(N).'
  },
  {
    title: 'Largest Rectangle in Histogram',
    difficulty: 'hard',
    points: 300,
    tags: ['Stacks', 'Monotonic Stack', 'Arrays'],
    statement: 'Given an array of integers `heights` representing the histogram\'s bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the maximum rectangle area integer.',
    constraints: '1 <= N <= 10^5\n0 <= heights[i] <= 10^4',
    sampleInput: '6\n2 1 5 6 2 3',
    sampleOutput: '10',
    explanation: 'The largest rectangle is formed by bars [5, 6] with area = 2 * 5 = 10.',
    testCases: [
      { type: 'sample', input: '6\n2 1 5 6 2 3', output: '10' },
      { type: 'sample', input: '2\n2 4', output: '4' }
    ],
    hiddenTestCases: [
      { input: '1\n5', output: '5' },
      { input: '4\n1 1 1 1', output: '4' }
    ],
    editorial: 'Maintain a monotonic increasing stack of indices. When a smaller bar is encountered, pop from stack and calculate area with popped bar as smallest height. Time: O(N), Space: O(N).'
  },
  {
    title: 'Sliding Window Maximum',
    difficulty: 'hard',
    points: 300,
    tags: ['Stacks', 'Queue', 'Sliding Window', 'Monotonic Queue'],
    statement: 'You are given an array of integers `nums`, there is a sliding window of size `k` which is moving from the very left of the array to the very right. You can only see the `k` numbers in the window. Each time the sliding window moves right by one position, find the maximum number in each window.',
    inputFormat: 'First line contains N and K.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the maximum value for each window separated by space.',
    constraints: '1 <= N <= 10^5\n1 <= k <= N\n-10^4 <= nums[i] <= 10^4',
    sampleInput: '8 3\n1 3 -1 -3 5 3 6 7',
    sampleOutput: '3 3 5 5 6 7',
    explanation: 'Window 1 [1 3 -1] -> 3. Window 2 [3 -1 -3] -> 3. Window 3 [-1 -3 5] -> 5. Window 4 [-3 5 3] -> 5. Window 5 [5 3 6] -> 6. Window 6 [3 6 7] -> 7.',
    testCases: [
      { type: 'sample', input: '8 3\n1 3 -1 -3 5 3 6 7', output: '3 3 5 5 6 7' },
      { type: 'sample', input: '1 1\n1', output: '1' }
    ],
    hiddenTestCases: [
      { input: '4 2\n9 11 8 5', output: '11 11 8' }
    ],
    editorial: 'Use a monotonic decreasing double-ended queue (deque) storing indices. Front of deque always holds the maximum element of the current window. Time: O(N), Space: O(K).'
  },

  // ─── 5. BINARY SEARCH ─────────────────────────────────────────────────────
  {
    title: 'Binary Search',
    difficulty: 'easy',
    points: 100,
    tags: ['Binary Search', 'Arrays'],
    statement: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return -1.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated sorted integers.\nThird line contains integer target.',
    outputFormat: 'Print the 0-based index or -1 if not found.',
    constraints: '1 <= N <= 10^4\n-10^4 < nums[i], target < 10^4\nAll integers in nums are unique.',
    sampleInput: '6\n-1 0 3 5 9 12\n9',
    sampleOutput: '4',
    explanation: '9 exists in nums and its index is 4.',
    testCases: [
      { type: 'sample', input: '6\n-1 0 3 5 9 12\n9', output: '4' },
      { type: 'sample', input: '6\n-1 0 3 5 9 12\n2', output: '-1' }
    ],
    hiddenTestCases: [
      { input: '1\n5\n5', output: '0' },
      { input: '2\n2 5\n5', output: '1' }
    ],
    editorial: 'Initialize left=0, right=N-1. In each step, compute mid = left + (right - left) / 2. Narrow search space by half. Time: O(log N), Space: O(1).'
  },
  {
    title: 'Search in Rotated Sorted Array',
    difficulty: 'medium',
    points: 200,
    tags: ['Binary Search', 'Arrays'],
    statement: 'There is an integer array `nums` sorted in ascending order (with distinct values). Prior to being passed to your function, `nums` is possibly rotated at an unknown pivot index. Given the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.\nThird line contains integer target.',
    outputFormat: 'Print the 0-based index or -1.',
    constraints: '1 <= N <= 5000\n-10^4 <= nums[i] <= 10^4\nAll values of nums are unique.',
    sampleInput: '7\n4 5 6 7 0 1 2\n0',
    sampleOutput: '4',
    explanation: '0 is found at index 4.',
    testCases: [
      { type: 'sample', input: '7\n4 5 6 7 0 1 2\n0', output: '4' },
      { type: 'sample', input: '7\n4 5 6 7 0 1 2\n3', output: '-1' }
    ],
    hiddenTestCases: [
      { input: '1\n1\n0', output: '-1' },
      { input: '3\n5 1 3\n5', output: '0' }
    ],
    editorial: 'At any point in binary search on a rotated array, at least one half (left..mid or mid..right) is normally sorted. Check if target lies within the sorted half. Time: O(log N), Space: O(1).'
  },
  {
    title: 'Find Minimum in Rotated Sorted Array',
    difficulty: 'medium',
    points: 200,
    tags: ['Binary Search', 'Arrays'],
    statement: 'Suppose an array of length `n` sorted in ascending order is rotated between 1 and `n` times. Given the sorted rotated array `nums` of unique elements, return the minimum element of this array.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the minimum integer value.',
    constraints: '1 <= N <= 5000\n-5000 <= nums[i] <= 5000\nAll elements of nums are unique.',
    sampleInput: '5\n3 4 5 1 2',
    sampleOutput: '1',
    explanation: 'The original array was [1,2,3,4,5] rotated 3 times. Min element is 1.',
    testCases: [
      { type: 'sample', input: '5\n3 4 5 1 2', output: '1' },
      { type: 'sample', input: '7\n4 5 6 7 0 1 2', output: '0' }
    ],
    hiddenTestCases: [
      { input: '4\n11 13 15 17', output: '11' },
      { input: '2\n2 1', output: '1' }
    ],
    editorial: 'Compare nums[mid] with nums[right]. If nums[mid] > nums[right], minimum lies in right half (left = mid + 1). Else right = mid. Time: O(log N), Space: O(1).'
  },
  {
    title: 'Koko Eating Bananas',
    difficulty: 'medium',
    points: 200,
    tags: ['Binary Search', 'Arrays'],
    statement: 'Koko loves to eat bananas. There are `n` piles of bananas, the `i-th` pile has `piles[i]` bananas. The guards have gone and will come back in `h` hours. Koko can decide her bananas-per-hour eating speed of `k`. Return the minimum integer `k` such that she can eat all the bananas within `h` hours.',
    inputFormat: 'First line contains N and H.\nSecond line contains N space-separated integers representing piles.',
    outputFormat: 'Print the minimum integer speed k.',
    constraints: '1 <= N <= 10^4\nN <= H <= 10^9\n1 <= piles[i] <= 10^9',
    sampleInput: '4 8\n3 6 7 11',
    sampleOutput: '4',
    explanation: 'At speed k=4, hours required = ceil(3/4)+ceil(6/4)+ceil(7/4)+ceil(11/4) = 1+2+2+3 = 8 <= 8.',
    testCases: [
      { type: 'sample', input: '4 8\n3 6 7 11', output: '4' },
      { type: 'sample', input: '5 5\n30 11 23 4 20', output: '30' }
    ],
    hiddenTestCases: [
      { input: '5 6\n30 11 23 4 20', output: '23' }
    ],
    editorial: 'Binary search on answer speed k from 1 to max(piles). Check if sum of ceil(pile / k) <= H. Time: O(N log(max(piles))), Space: O(1).'
  },

  // ─── 6. TREES & BINARY SEARCH TREES ───────────────────────────────────────
  {
    title: 'Maximum Depth of Binary Tree',
    difficulty: 'easy',
    points: 100,
    tags: ['Trees', 'Binary Tree', 'DFS', 'BFS'],
    statement: 'Given the root of a binary tree represented in level-order (where null nodes are represented by -1), return its maximum depth. A binary tree\'s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
    inputFormat: 'First line contains integer N (number of node values).\nSecond line contains N space-separated integers in level-order (-1 represents null).',
    outputFormat: 'Print the maximum depth integer.',
    constraints: '0 <= N <= 10^4\n-100 <= Node.val <= 100',
    sampleInput: '7\n3 9 20 -1 -1 15 7',
    sampleOutput: '3',
    explanation: 'Root is 3, left child 9, right child 20 (with children 15 and 7). Depth = 3.',
    testCases: [
      { type: 'sample', input: '7\n3 9 20 -1 -1 15 7', output: '3' },
      { type: 'sample', input: '2\n1 -1', output: '1' }
    ],
    hiddenTestCases: [
      { input: '0\n', output: '0' },
      { input: '3\n1 2 3', output: '2' }
    ],
    editorial: 'Depth = 1 + max(maxDepth(left), maxDepth(right)). Can be implemented recursively or via level-order BFS. Time: O(N), Space: O(H).'
  },
  {
    title: 'Invert Binary Tree',
    difficulty: 'easy',
    points: 100,
    tags: ['Trees', 'Binary Tree', 'DFS'],
    statement: 'Given the root of a binary tree in level-order format, invert the tree (mirror left and right subtrees), and return its level-order traversal.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers (-1 represents null).',
    outputFormat: 'Print the level-order traversal of the inverted tree.',
    constraints: '0 <= N <= 100\n-100 <= Node.val <= 100',
    sampleInput: '7\n4 2 7 1 3 6 9',
    sampleOutput: '4 7 2 9 6 3 1',
    explanation: 'Subtrees of 4 are swapped (2 and 7 swapped, 1 and 3 swapped, 6 and 9 swapped).',
    testCases: [
      { type: 'sample', input: '7\n4 2 7 1 3 6 9', output: '4 7 2 9 6 3 1' },
      { type: 'sample', input: '3\n2 1 3', output: '2 3 1' }
    ],
    hiddenTestCases: [
      { input: '0\n', output: '' }
    ],
    editorial: 'Recursively swap root.left and root.right. Then invert(root.left) and invert(root.right). Time: O(N), Space: O(H).'
  },
  {
    title: 'Validate Binary Search Tree',
    difficulty: 'medium',
    points: 200,
    tags: ['Trees', 'Binary Search Tree', 'DFS'],
    statement: 'Given the root of a binary tree in level order format (-1 represents null), determine if it is a valid binary search tree (BST).',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print "true" if it is a valid BST, otherwise "false".',
    constraints: '1 <= N <= 10^4\n-2^31 <= Node.val <= 2^31 - 1',
    sampleInput: '3\n2 1 3',
    sampleOutput: 'true',
    explanation: 'Root 2 has left child 1 (<2) and right child 3 (>2). Valid BST.',
    testCases: [
      { type: 'sample', input: '3\n2 1 3', output: 'true' },
      { type: 'sample', input: '5\n5 1 4 -1 -1 3 6', output: 'false' }
    ],
    hiddenTestCases: [
      { input: '1\n10', output: 'true' },
      { input: '3\n2 2 2', output: 'false' }
    ],
    editorial: 'Validate recursively with valid range [min_val, max_val]. Left subtree must be strictly < root.val and right subtree must be strictly > root.val. Time: O(N), Space: O(H).'
  },
  {
    title: 'Lowest Common Ancestor of a BST',
    difficulty: 'medium',
    points: 200,
    tags: ['Trees', 'Binary Search Tree', 'DFS'],
    statement: 'Given a binary search tree (BST) and two node values `p` and `q`, find the Lowest Common Ancestor (LCA) value of the two given nodes.',
    inputFormat: 'First line contains integer N (number of tree nodes in level order).\nSecond line contains N space-separated integers (-1 represents null).\nThird line contains two integers p and q.',
    outputFormat: 'Print the value of the LCA node.',
    constraints: '2 <= N <= 10^5\nAll Node.val are unique.\np and q will exist in the BST.',
    sampleInput: '9\n6 2 8 0 4 7 9 -1 -1 3 5\n2 8',
    sampleOutput: '6',
    explanation: 'The LCA of nodes 2 and 8 is 6.',
    testCases: [
      { type: 'sample', input: '9\n6 2 8 0 4 7 9 -1 -1 3 5\n2 8', output: '6' },
      { type: 'sample', input: '9\n6 2 8 0 4 7 9 -1 -1 3 5\n2 4', output: '2' }
    ],
    hiddenTestCases: [
      { input: '3\n2 1 3\n1 3', output: '2' }
    ],
    editorial: 'In a BST: if both p and q are smaller than root, LCA is in left subtree. If both are greater, LCA is in right subtree. Otherwise, current root is the LCA. Time: O(H), Space: O(1).'
  },
  {
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'medium',
    points: 200,
    tags: ['Trees', 'Binary Tree', 'BFS'],
    statement: 'Given the root of a binary tree, return the level order traversal of its nodes\' values (i.e., from left to right, level by level).',
    inputFormat: 'First line contains integer N.\nSecond line contains N level-order values (-1 represents null).',
    outputFormat: 'Print each level on a new line with space-separated node values.',
    constraints: '0 <= N <= 2000\n-1000 <= Node.val <= 1000',
    sampleInput: '7\n3 9 20 -1 -1 15 7',
    sampleOutput: '3\n9 20\n15 7',
    explanation: 'Level 0: [3]. Level 1: [9, 20]. Level 2: [15, 7].',
    testCases: [
      { type: 'sample', input: '7\n3 9 20 -1 -1 15 7', output: '3\n9 20\n15 7' },
      { type: 'sample', input: '1\n1', output: '1' }
    ],
    hiddenTestCases: [
      { input: '3\n1 2 3', output: '1\n2 3' }
    ],
    editorial: 'Use a FIFO queue for Breadth-First Search (BFS). Process queue level-by-level using queue size. Time: O(N), Space: O(W).'
  },

  // ─── 7. HEAPS & PRIORITY QUEUES ───────────────────────────────────────────
  {
    title: 'Kth Largest Element in an Array',
    difficulty: 'medium',
    points: 200,
    tags: ['Heaps', 'Priority Queue', 'Sorting', 'Quickselect'],
    statement: 'Given an integer array `nums` and an integer `k`, return the `k-th` largest element in the array. Note that it is the `k-th` largest element in the sorted order, not the `k-th` distinct element.',
    inputFormat: 'First line contains N and K.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the k-th largest integer.',
    constraints: '1 <= K <= N <= 10^5\n-10^4 <= nums[i] <= 10^4',
    sampleInput: '6 2\n3 2 1 5 6 4',
    sampleOutput: '5',
    explanation: 'Sorted in descending order: 6, 5, 4, 3, 2, 1. The 2nd largest is 5.',
    testCases: [
      { type: 'sample', input: '6 2\n3 2 1 5 6 4', output: '5' },
      { type: 'sample', input: '9 4\n3 2 3 1 2 4 5 5 6', output: '4' }
    ],
    hiddenTestCases: [
      { input: '1 1\n10', output: '10' },
      { input: '5 1\n1 2 3 4 5', output: '5' }
    ],
    editorial: 'Use a min-heap of size K. For each element, push to heap and pop if size exceeds K. The top of the min-heap is the k-th largest. Time: O(N log K), Space: O(K).'
  },
  {
    title: 'Top K Frequent Elements',
    difficulty: 'medium',
    points: 200,
    tags: ['Heaps', 'Priority Queue', 'Hashing', 'Bucket Sort'],
    statement: 'Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in ascending sorted order.',
    inputFormat: 'First line contains N and K.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print K space-separated integers representing the top K frequent elements in ascending order.',
    constraints: '1 <= N <= 10^5\n1 <= K <= number of unique elements',
    sampleInput: '6 2\n1 1 1 2 2 3',
    sampleOutput: '1 2',
    explanation: 'Element 1 appears 3 times, element 2 appears 2 times. The top 2 frequent elements are 1 and 2.',
    testCases: [
      { type: 'sample', input: '6 2\n1 1 1 2 2 3', output: '1 2' },
      { type: 'sample', input: '1 1\n1', output: '1' }
    ],
    hiddenTestCases: [
      { input: '4 2\n4 4 2 2', output: '2 4' }
    ],
    editorial: 'Count frequencies with hash map. Use Bucket Sort where bucket index represents frequency, or a min-heap of size K. Time: O(N), Space: O(N).'
  },
  {
    title: 'Find Median from Data Stream',
    difficulty: 'hard',
    points: 300,
    tags: ['Heaps', 'Priority Queue', 'Design'],
    statement: 'The median is the middle value in an ordered integer list. Implement a data structure that receives integers one by one and outputs the running median after each insertion (printed formatted to 1 decimal place).',
    inputFormat: 'First line contains integer N (number of insertions).\nSecond line contains N space-separated integers.',
    outputFormat: 'Print N space-separated numbers representing the running median after each insertion.',
    constraints: '1 <= N <= 10^4\n-10^5 <= num <= 10^5',
    sampleInput: '4\n1 2 3 4',
    sampleOutput: '1.0 1.5 2.0 2.5',
    explanation: 'After 1: 1.0. After 2: (1+2)/2=1.5. After 3: 2.0. After 4: (2+3)/2=2.5.',
    testCases: [
      { type: 'sample', input: '4\n1 2 3 4', output: '1.0 1.5 2.0 2.5' }
    ],
    hiddenTestCases: [
      { input: '1\n5', output: '5.0' },
      { input: '3\n2 3 4', output: '2.0 2.5 3.0' }
    ],
    editorial: 'Use two heaps: a max-heap for the smaller half and a min-heap for the larger half. Balance sizes so they differ by at most 1. Time: O(log N) per insert, O(1) for median.'
  },

  // ─── 8. BACKTRACKING & RECURSION ──────────────────────────────────────────
  {
    title: 'Subsets (Power Set)',
    difficulty: 'medium',
    points: 200,
    tags: ['Backtracking', 'Bit Manipulation', 'Recursion'],
    statement: 'Given an integer array `nums` of unique elements, return the total count of subsets (the power set).',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the total number of subsets (2^N).',
    constraints: '1 <= N <= 20\n-10 <= nums[i] <= 10',
    sampleInput: '3\n1 2 3',
    sampleOutput: '8',
    explanation: 'The 8 subsets are: [], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]. Count = 8.',
    testCases: [
      { type: 'sample', input: '3\n1 2 3', output: '8' },
      { type: 'sample', input: '1\n0', output: '2' }
    ],
    hiddenTestCases: [
      { input: '4\n1 2 3 4', output: '16' },
      { input: '5\n1 2 3 4 5', output: '32' }
    ],
    editorial: 'Each element can either be included or excluded. Total subsets = 2^N. Backtracking explores both choices for each element. Time: O(2^N), Space: O(N).'
  },
  {
    title: 'Permutations',
    difficulty: 'medium',
    points: 200,
    tags: ['Backtracking', 'Recursion'],
    statement: 'Given an array `nums` of distinct integers, return the total count of possible permutations (N!).',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the total number of permutations.',
    constraints: '1 <= N <= 10\n-10 <= nums[i] <= 10',
    sampleInput: '3\n1 2 3',
    sampleOutput: '6',
    explanation: 'There are 3! = 6 permutations: [1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1].',
    testCases: [
      { type: 'sample', input: '3\n1 2 3', output: '6' },
      { type: 'sample', input: '2\n0 1', output: '2' }
    ],
    hiddenTestCases: [
      { input: '1\n1', output: '1' },
      { input: '4\n1 2 3 4', output: '24' }
    ],
    editorial: 'Backtracking with swapped elements or a visited boolean array. Total permutations = N!. Time: O(N * N!), Space: O(N).'
  },
  {
    title: 'Combination Sum',
    difficulty: 'medium',
    points: 200,
    tags: ['Backtracking', 'Arrays'],
    statement: 'Given an array of distinct integers `candidates` and a target integer `target`, return the count of all unique combinations of `candidates` where the chosen numbers sum to `target`. The same number may be chosen from `candidates` an unlimited number of times.',
    inputFormat: 'First line contains N and target.\nSecond line contains N space-separated candidate integers.',
    outputFormat: 'Print the count of unique valid combinations.',
    constraints: '1 <= N <= 30\n2 <= candidates[i] <= 40\n1 <= target <= 40',
    sampleInput: '4 7\n2 3 6 7',
    sampleOutput: '2',
    explanation: 'The 2 combinations are [2, 2, 3] and [7]. Count = 2.',
    testCases: [
      { type: 'sample', input: '4 7\n2 3 6 7', output: '2' },
      { type: 'sample', input: '3 8\n2 3 5', output: '3' }
    ],
    hiddenTestCases: [
      { input: '1 2\n2', output: '1' }
    ],
    editorial: 'Backtrack with choice to either pick the current candidate again (target - candidates[i]) or advance to next candidate index. Time: O(2^target), Space: O(target).'
  },
  {
    title: 'Word Search',
    difficulty: 'medium',
    points: 200,
    tags: ['Backtracking', 'Matrix', 'DFS'],
    statement: 'Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid. The word can be constructed from letters of sequentially adjacent cells (horizontally or vertically neighboring). The same letter cell may not be used more than once in a word.',
    inputFormat: 'First line contains R and C (rows and columns).\nNext R lines contain C space-separated characters.\nLast line contains string word.',
    outputFormat: 'Print "true" if word exists, else "false".',
    constraints: '1 <= R, C <= 6\n1 <= word.length <= 15',
    sampleInput: '3 4\nA B C E\nS F C S\nA D E E\nABCCED',
    sampleOutput: 'true',
    explanation: 'The word "ABCCED" can be traced through the grid.',
    testCases: [
      { type: 'sample', input: '3 4\nA B C E\nS F C S\nA D E E\nABCCED', output: 'true' },
      { type: 'sample', input: '3 4\nA B C E\nS F C S\nA D E E\nABCB', output: 'false' }
    ],
    hiddenTestCases: [
      { input: '1 1\nA\nA', output: 'true' }
    ],
    editorial: 'Run DFS backtracking from every cell that matches word[0]. Mark visited cells temporarily (e.g. board[r][c] = \'#\') and restore on backtrack. Time: O(R * C * 4^L), Space: O(L).'
  },
  {
    title: 'N-Queens',
    difficulty: 'hard',
    points: 300,
    tags: ['Backtracking', 'Recursion'],
    statement: 'The n-queens puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other. Given an integer `n`, return the total number of distinct solutions.',
    inputFormat: 'Single line containing integer N.',
    outputFormat: 'Print the total number of valid board configurations.',
    constraints: '1 <= N <= 12',
    sampleInput: '4',
    sampleOutput: '2',
    explanation: 'There are 2 distinct configurations for a 4x4 board.',
    testCases: [
      { type: 'sample', input: '4', output: '2' },
      { type: 'sample', input: '1', output: '1' }
    ],
    hiddenTestCases: [
      { input: '8', output: '92' },
      { input: '5', output: '10' }
    ],
    editorial: 'Place queens row by row. Use sets/bitmasks to track occupied columns, positive diagonals (row + col), and negative diagonals (row - col). Time: O(N!), Space: O(N).'
  },

  // ─── 9. GRAPHS & BFS / DFS ────────────────────────────────────────────────
  {
    title: 'Number of Islands',
    difficulty: 'medium',
    points: 200,
    tags: ['Graphs', 'BFS', 'DFS', 'Matrix'],
    statement: 'Given an `m x n` 2D binary grid `grid` which represents a map of \'1\'s (land) and \'0\'s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
    inputFormat: 'First line contains R and C.\nNext R lines contain C space-separated integers (0 or 1).',
    outputFormat: 'Print the count of connected islands.',
    constraints: '1 <= R, C <= 300',
    sampleInput: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0',
    sampleOutput: '1',
    explanation: 'All 1s form a single connected island.',
    testCases: [
      { type: 'sample', input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0', output: '1' },
      { type: 'sample', input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', output: '3' }
    ],
    hiddenTestCases: [
      { input: '1 1\n0', output: '0' },
      { input: '2 2\n1 0\n0 1', output: '2' }
    ],
    editorial: 'Iterate through every cell. When a \'1\' is encountered, increment island count and run BFS/DFS to sink all connected land cells to \'0\'. Time: O(R * C), Space: O(R * C).'
  },
  {
    title: 'Rotting Oranges',
    difficulty: 'medium',
    points: 200,
    tags: ['Graphs', 'BFS', 'Matrix'],
    statement: 'You are given an `m x n` grid where each cell can have one of three values: 0 representing empty cell, 1 representing fresh orange, 2 representing rotten orange. Every minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return -1.',
    inputFormat: 'First line contains R and C.\nNext R lines contain C space-separated integers (0, 1, or 2).',
    outputFormat: 'Print minimum minutes or -1.',
    constraints: '1 <= R, C <= 100',
    sampleInput: '3 3\n2 1 1\n1 1 0\n0 1 1',
    sampleOutput: '4',
    explanation: 'Rot spreads level by level. After 4 minutes all fresh oranges are rotten.',
    testCases: [
      { type: 'sample', input: '3 3\n2 1 1\n1 1 0\n0 1 1', output: '4' },
      { type: 'sample', input: '3 3\n2 1 1\n0 1 1\n1 0 1', output: '-1' }
    ],
    hiddenTestCases: [
      { input: '1 2\n0 2', output: '0' }
    ],
    editorial: 'Multi-source BFS starting with all rotten oranges in a queue. Count fresh oranges. Decrement count as BFS spreads. If fresh count becomes 0, return elapsed minutes. Time: O(R * C), Space: O(R * C).'
  },
  {
    title: 'Course Schedule (Topological Sort)',
    difficulty: 'medium',
    points: 200,
    tags: ['Graphs', 'Topological Sort', 'BFS', 'DFS'],
    statement: 'There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` first if you want to take course `a`. Return `true` if you can finish all courses, or `false` otherwise (i.e. check for cycles in directed graph).',
    inputFormat: 'First line contains numCourses N and number of prerequisites M.\nNext M lines contain two integers a and b (b -> a).',
    outputFormat: 'Print "true" if possible to finish all courses, else "false".',
    constraints: '1 <= N <= 2000\n0 <= M <= 5000',
    sampleInput: '2 1\n1 0',
    sampleOutput: 'true',
    explanation: 'To take course 1 you must finish course 0. Valid order: 0, 1.',
    testCases: [
      { type: 'sample', input: '2 1\n1 0', output: 'true' },
      { type: 'sample', input: '2 2\n1 0\n0 1', output: 'false' }
    ],
    hiddenTestCases: [
      { input: '3 2\n1 0\n2 1', output: 'true' },
      { input: '1 0\n', output: 'true' }
    ],
    editorial: 'Kahn\'s Algorithm (BFS with in-degrees): Compute in-degree for all vertices. Push 0 in-degree nodes to queue. Pop and reduce neighbor in-degrees. If processed count == N, no cycle exists. Time: O(V + E), Space: O(V + E).'
  },
  {
    title: 'Network Delay Time (Dijkstra\'s Algorithm)',
    difficulty: 'medium',
    points: 200,
    tags: ['Graphs', 'Shortest Path', 'Dijkstra', 'Heaps'],
    statement: 'You are given a network of `n` nodes, labeled from `1` to `n`. You are also given `times`, a list of travel times as directed edges `times[i] = (u, v, w)`. We will send a signal from a given node `k`. Return the minimum time it takes for all the `n` nodes to receive the signal. If it is impossible for all the `n` nodes to receive the signal, return `-1`.',
    inputFormat: 'First line contains N, M, and K (nodes, edges, start node).\nNext M lines contain u, v, w (from, to, weight).',
    outputFormat: 'Print the minimum time or -1.',
    constraints: '1 <= K <= N <= 100\n1 <= M <= 6000\n0 <= w <= 100',
    sampleInput: '4 3 2\n2 1 1\n2 3 1\n3 4 1',
    sampleOutput: '2',
    explanation: 'Signal starts at 2: reaches 1 at t=1, reaches 3 at t=1, reaches 4 at t=2. Max time = 2.',
    testCases: [
      { type: 'sample', input: '4 3 2\n2 1 1\n2 3 1\n3 4 1', output: '2' },
      { type: 'sample', input: '2 1 1\n1 2 1', output: '1' }
    ],
    hiddenTestCases: [
      { input: '2 1 2\n1 2 1', output: '-1' }
    ],
    editorial: 'Dijkstra\'s Algorithm using a min-heap priority queue. Track shortest distance to all nodes. Answer is max(distances) if all nodes reachable. Time: O((V + E) log V), Space: O(V + E).'
  },

  // ─── 10. DYNAMIC PROGRAMMING ──────────────────────────────────────────────
  {
    title: 'Climbing Stairs',
    difficulty: 'easy',
    points: 100,
    tags: ['Dynamic Programming', 'Math'],
    statement: 'You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    inputFormat: 'Single line containing integer N.',
    outputFormat: 'Print the total distinct ways as an integer.',
    constraints: '1 <= N <= 45',
    sampleInput: '3',
    sampleOutput: '3',
    explanation: 'Three ways: 1+1+1, 1+2, 2+1.',
    testCases: [
      { type: 'sample', input: '3', output: '3' },
      { type: 'sample', input: '2', output: '2' }
    ],
    hiddenTestCases: [
      { input: '1', output: '1' },
      { input: '4', output: '5' },
      { input: '5', output: '8' }
    ],
    editorial: 'dp[i] = dp[i-1] + dp[i-2] (Fibonacci sequence). Maintain two variables for O(1) space. Time: O(N), Space: O(1).'
  },
  {
    title: 'Coin Change',
    difficulty: 'medium',
    points: 200,
    tags: ['Dynamic Programming', 'BFS'],
    statement: 'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.',
    inputFormat: 'First line contains N and amount.\nSecond line contains N space-separated coin denominations.',
    outputFormat: 'Print the minimum number of coins or -1.',
    constraints: '1 <= N <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4',
    sampleInput: '3 11\n1 2 5',
    sampleOutput: '3',
    explanation: '11 = 5 + 5 + 1 (3 coins).',
    testCases: [
      { type: 'sample', input: '3 11\n1 2 5', output: '3' },
      { type: 'sample', input: '1 3\n2', output: '-1' }
    ],
    hiddenTestCases: [
      { input: '1 0\n1', output: '0' },
      { input: '4 6249\n186 419 83 408', output: '20' }
    ],
    editorial: 'Bottom-up DP: dp[i] = min(dp[i - coin] + 1) for all coins <= i. Initialize dp array with infinity and dp[0] = 0. Time: O(N * amount), Space: O(amount).'
  },
  {
    title: 'Longest Increasing Subsequence',
    difficulty: 'medium',
    points: 200,
    tags: ['Dynamic Programming', 'Binary Search'],
    statement: 'Given an integer array `nums`, return the length of the longest strictly increasing subsequence.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the length of the LIS.',
    constraints: '1 <= N <= 2500\n-10^4 <= nums[i] <= 10^4',
    sampleInput: '8\n10 9 2 5 3 7 101 18',
    sampleOutput: '4',
    explanation: 'The longest increasing subsequence is [2, 3, 7, 101], length = 4.',
    testCases: [
      { type: 'sample', input: '8\n10 9 2 5 3 7 101 18', output: '4' },
      { type: 'sample', input: '6\n0 1 0 3 2 3', output: '4' }
    ],
    hiddenTestCases: [
      { input: '7\n7 7 7 7 7 7 7', output: '1' }
    ],
    editorial: 'Patience sorting with binary search (std::lower_bound): Maintain array tails[] of smallest tail of all increasing subsequences of length i+1. Time: O(N log N), Space: O(N).'
  },
  {
    title: 'House Robber',
    difficulty: 'medium',
    points: 200,
    tags: ['Dynamic Programming', 'Arrays'],
    statement: 'You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. Adjacent houses have security systems connected; it will automatically contact the police if two adjacent houses were broken into on the same night. Given an integer array `nums` representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print the maximum robbery amount.',
    constraints: '1 <= N <= 100\n0 <= nums[i] <= 400',
    sampleInput: '4\n1 2 3 1',
    sampleOutput: '4',
    explanation: 'Rob house 1 (money = 1) and then rob house 3 (money = 3). Total amount = 1 + 3 = 4.',
    testCases: [
      { type: 'sample', input: '4\n1 2 3 1', output: '4' },
      { type: 'sample', input: '5\n2 7 9 3 1', output: '12' }
    ],
    hiddenTestCases: [
      { input: '1\n100', output: '100' },
      { input: '2\n2 1', output: '2' }
    ],
    editorial: 'dp[i] = max(dp[i-1], dp[i-2] + nums[i]). Maintain two variables rob1 and rob2. Time: O(N), Space: O(1).'
  },
  {
    title: '0/1 Knapsack Problem',
    difficulty: 'medium',
    points: 200,
    tags: ['Dynamic Programming'],
    statement: 'Given `N` items, each with a specific weight `wt[i]` and value `val[i]`, and a knapsack with maximum weight capacity `W`, determine the maximum value that can be put in the knapsack.',
    inputFormat: 'First line contains N and W.\nSecond line contains N space-separated integers for values.\nThird line contains N space-separated integers for weights.',
    outputFormat: 'Print the maximum value attainable.',
    constraints: '1 <= N <= 1000\n1 <= W <= 1000\n1 <= val[i], wt[i] <= 1000',
    sampleInput: '3 4\n1 2 3\n4 5 1',
    sampleOutput: '3',
    explanation: 'Take item 3 with weight 1 and value 3. Fits in capacity 4.',
    testCases: [
      { type: 'sample', input: '3 4\n1 2 3\n4 5 1', output: '3' },
      { type: 'sample', input: '3 50\n60 100 120\n10 20 30', output: '220' }
    ],
    hiddenTestCases: [
      { input: '2 3\n10 20\n3 4', output: '10' }
    ],
    editorial: '2D/1D DP: dp[w] = max(dp[w], dp[w - wt[i]] + val[i]), iterating weights backwards from W down to wt[i]. Time: O(N * W), Space: O(W).'
  },
  {
    title: 'Edit Distance',
    difficulty: 'hard',
    points: 300,
    tags: ['Dynamic Programming', 'Strings'],
    statement: 'Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`. You have three operations: Insert a character, Delete a character, Replace a character.',
    inputFormat: 'First line contains string word1.\nSecond line contains string word2.',
    outputFormat: 'Print the minimum edit operations integer.',
    constraints: '0 <= word1.length, word2.length <= 500\nword1 and word2 consist of lowercase English letters.',
    sampleInput: 'horse\nros',
    sampleOutput: '3',
    explanation: 'horse -> rorse (replace \'h\' with \'r\') -> rose (remove \'r\') -> ros (remove \'e\'). Total = 3 ops.',
    testCases: [
      { type: 'sample', input: 'horse\nros', output: '3' },
      { type: 'sample', input: 'intention\nexecution', output: '5' }
    ],
    hiddenTestCases: [
      { input: 'a\nb', output: '1' },
      { input: 'abc\nabc', output: '0' }
    ],
    editorial: 'If characters match: dp[i][j] = dp[i-1][j-1]. Otherwise 1 + min(dp[i-1][j] (delete), dp[i][j-1] (insert), dp[i-1][j-1] (replace)). Time: O(M * N), Space: O(M * N).'
  },
  {
    title: 'Unique Paths',
    difficulty: 'medium',
    points: 200,
    tags: ['Dynamic Programming', 'Combinatorics', 'Matrix'],
    statement: 'There is a robot on an `m x n` grid. The robot is initially located at the top-left corner `(0, 0)` and tries to move to the bottom-right corner `(m - 1, n - 1)`. The robot can only move either down or right at any point in time. Given the two integers `m` and `n`, return the number of possible unique paths.',
    inputFormat: 'Single line containing two integers M and N.',
    outputFormat: 'Print the count of unique paths.',
    constraints: '1 <= M, N <= 100',
    sampleInput: '3 7',
    sampleOutput: '28',
    explanation: 'Total paths from (0,0) to (2,6) moving only right and down is 28.',
    testCases: [
      { type: 'sample', input: '3 7', output: '28' },
      { type: 'sample', input: '3 2', output: '3' }
    ],
    hiddenTestCases: [
      { input: '1 1', output: '1' },
      { input: '2 2', output: '2' }
    ],
    editorial: 'Combinations formula C(m+n-2, m-1) or DP: dp[i][j] = dp[i-1][j] + dp[i][j-1] with base cases dp[0][*] = 1, dp[*][0] = 1. Time: O(M * N), Space: O(N).'
  },
  {
    title: 'Longest Common Subsequence',
    difficulty: 'medium',
    points: 200,
    tags: ['Dynamic Programming', 'Strings'],
    statement: 'Given two strings `text1` and `text2`, return the length of their longest common subsequence. If there is no common subsequence, return 0.',
    inputFormat: 'First line contains string text1.\nSecond line contains string text2.',
    outputFormat: 'Print the length of the LCS.',
    constraints: '1 <= text1.length, text2.length <= 1000\nstrings consist of only lowercase English characters.',
    sampleInput: 'abcde\nace',
    sampleOutput: '3',
    explanation: 'The longest common subsequence is "ace" and its length is 3.',
    testCases: [
      { type: 'sample', input: 'abcde\nace', output: '3' },
      { type: 'sample', input: 'abc\nabc', output: '3' }
    ],
    hiddenTestCases: [
      { input: 'abc\ndef', output: '0' }
    ],
    editorial: 'If text1[i] == text2[j]: dp[i][j] = 1 + dp[i-1][j-1]. Else: dp[i][j] = max(dp[i-1][j], dp[i][j-1]). Time: O(M * N), Space: O(M * N).'
  },

  // ─── 11. GREEDY ALGORITHMS & INTERVALS ────────────────────────────────────
  {
    title: 'Jump Game',
    difficulty: 'medium',
    points: 200,
    tags: ['Greedy', 'Dynamic Programming', 'Arrays'],
    statement: 'You are given an integer array `nums`. You are initially positioned at the array\'s first index, and each element in the array represents your maximum jump length at that position. Return `true` if you can reach the last index, or `false` otherwise.',
    inputFormat: 'First line contains integer N.\nSecond line contains N space-separated integers.',
    outputFormat: 'Print "true" if reachable, otherwise "false".',
    constraints: '1 <= N <= 10^4\n0 <= nums[i] <= 10^5',
    sampleInput: '5\n2 3 1 1 4',
    sampleOutput: 'true',
    explanation: 'Jump 1 step from index 0 to 1, then 3 steps to the last index.',
    testCases: [
      { type: 'sample', input: '5\n2 3 1 1 4', output: 'true' },
      { type: 'sample', input: '5\n3 2 1 0 4', output: 'false' }
    ],
    hiddenTestCases: [
      { input: '1\n0', output: 'true' },
      { input: '2\n2 0', output: 'true' }
    ],
    editorial: 'Greedy approach: Track `max_reach`. For each index i, if i > max_reach return false. max_reach = max(max_reach, i + nums[i]). If max_reach >= N-1 return true. Time: O(N), Space: O(1).'
  },
  {
    title: 'Merge Intervals',
    difficulty: 'medium',
    points: 200,
    tags: ['Greedy', 'Intervals', 'Sorting', 'Arrays'],
    statement: 'Given an array of intervals where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return the total count of non-overlapping intervals that cover all the intervals in the input.',
    inputFormat: 'First line contains integer N.\nNext N lines contain two space-separated integers start and end.',
    outputFormat: 'Print the count of merged intervals.',
    constraints: '1 <= N <= 10^4\n0 <= start_i <= end_i <= 10^4',
    sampleInput: '4\n1 3\n2 6\n8 10\n15 18',
    sampleOutput: '3',
    explanation: 'Intervals [1,3] and [2,6] merge into [1,6]. Merged list: [1,6], [8,10], [15,18]. Total = 3.',
    testCases: [
      { type: 'sample', input: '4\n1 3\n2 6\n8 10\n15 18', output: '3' },
      { type: 'sample', input: '2\n1 4\n4 5', output: '1' }
    ],
    hiddenTestCases: [
      { input: '1\n1 4', output: '1' }
    ],
    editorial: 'Sort intervals by start time. If current interval overlaps with previous (start <= prev_end), merge by updating prev_end = max(prev_end, end). Time: O(N log N), Space: O(N).'
  },
  {
    title: 'Non-overlapping Intervals',
    difficulty: 'medium',
    points: 200,
    tags: ['Greedy', 'Intervals', 'Sorting'],
    statement: 'Given an array of intervals `intervals` where `intervals[i] = [start_i, end_i]`, return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.',
    inputFormat: 'First line contains integer N.\nNext N lines contain start and end.',
    outputFormat: 'Print minimum removals count integer.',
    constraints: '1 <= N <= 10^5\n-5 * 10^4 <= start_i < end_i <= 5 * 10^4',
    sampleInput: '4\n1 2\n2 3\n3 4\n1 3',
    sampleOutput: '1',
    explanation: '[1,3] can be removed and the rest of the intervals are non-overlapping.',
    testCases: [
      { type: 'sample', input: '4\n1 2\n2 3\n3 4\n1 3', output: '1' },
      { type: 'sample', input: '3\n1 2\n1 2\n1 2', output: '2' }
    ],
    hiddenTestCases: [
      { input: '2\n1 2\n2 3', output: '0' }
    ],
    editorial: 'Interval Scheduling (Greedy): Sort intervals by end time. Always keep the interval that finishes earliest to maximize room for future intervals. Time: O(N log N), Space: O(1).'
  },
  {
    title: 'Gas Station',
    difficulty: 'medium',
    points: 200,
    tags: ['Greedy', 'Arrays'],
    statement: 'There are `n` gas stations along a circular route, where the amount of gas at the `i-th` station is `gas[i]`. It costs `cost[i]` of gas to travel from the `i-th` station to its next `(i + 1)-th` station. Return the starting gas station\'s index if you can travel around the circuit once in the clockwise direction, otherwise return -1.',
    inputFormat: 'First line contains integer N.\nSecond line contains N gas amounts.\nThird line contains N cost amounts.',
    outputFormat: 'Print 0-based starting station index or -1.',
    constraints: '1 <= N <= 10^5\n0 <= gas[i], cost[i] <= 10^4',
    sampleInput: '5\n1 2 3 4 5\n3 4 5 1 2',
    sampleOutput: '3',
    explanation: 'Start at station 3 (index 3) and fill up with 4 unit of gas. Complete circuit with remaining gas.',
    testCases: [
      { type: 'sample', input: '5\n1 2 3 4 5\n3 4 5 1 2', output: '3' },
      { type: 'sample', input: '3\n2 3 4\n3 4 3', output: '-1' }
    ],
    hiddenTestCases: [
      { input: '1\n5\n4', output: '0' }
    ],
    editorial: 'If total gas < total cost, return -1. Otherwise, maintain current tank. If tank drops below 0 at station i, reset tank to 0 and set candidate start = i + 1. Time: O(N), Space: O(1).'
  },

  // ─── 12. TRIE & ADVANCED DATA STRUCTURES ──────────────────────────────────
  {
    title: 'Implement Trie (Prefix Tree)',
    difficulty: 'medium',
    points: 200,
    tags: ['Trie', 'Design', 'Strings', 'Trees'],
    statement: 'A trie (pronounced "try") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. Process a sequence of INSERT, SEARCH, and STARTS_WITH queries.',
    inputFormat: 'First line contains integer Q (number of operations).\nNext Q lines contain operation: "INSERT word", "SEARCH word", or "STARTS_WITH prefix".',
    outputFormat: 'Print results of SEARCH and STARTS_WITH queries separated by space ("true" or "false").',
    constraints: '1 <= Q <= 3 * 10^4\n1 <= word.length, prefix.length <= 2000',
    sampleInput: '5\nINSERT apple\nSEARCH apple\nSEARCH app\nSTARTS_WITH app\nINSERT app',
    sampleOutput: 'true false true',
    explanation: 'SEARCH apple = true, SEARCH app = false, STARTS_WITH app = true.',
    testCases: [
      { type: 'sample', input: '5\nINSERT apple\nSEARCH apple\nSEARCH app\nSTARTS_WITH app\nINSERT app', output: 'true false true' }
    ],
    hiddenTestCases: [
      { input: '2\nINSERT code\nSEARCH code', output: 'true' }
    ],
    editorial: 'Each TrieNode has an array of 26 children pointers and an `is_end_of_word` boolean flag. Insertion and lookup are O(L) where L is key length.'
  },
  {
    title: 'Range Sum Query - Segment Tree',
    difficulty: 'hard',
    points: 300,
    tags: ['Segment Tree', 'Data Structures', 'Binary Indexed Tree', 'Arrays'],
    statement: 'Given an integer array `nums`, handle multiple queries of two types:\n1. UPDATE index val: Update the value of nums[index] to be val.\n2. SUM left right: Return the sum of the elements of nums between indices left and right inclusive.',
    inputFormat: 'First line contains N and Q.\nSecond line contains N space-separated integers.\nNext Q lines contain queries: "UPDATE i val" or "SUM l r".',
    outputFormat: 'Print result for each SUM query on a new line.',
    constraints: '1 <= N, Q <= 3 * 10^4\n-1000 <= nums[i] <= 1000\n0 <= index, left <= right < N',
    sampleInput: '3 4\n1 3 5\nSUM 0 2\nUPDATE 1 2\nSUM 0 2\nSUM 1 2',
    sampleOutput: '9\n8\n7',
    explanation: 'Sum(0,2) = 1+3+5 = 9. Update index 1 to 2 -> [1, 2, 5]. Sum(0,2) = 8. Sum(1,2) = 7.',
    testCases: [
      { type: 'sample', input: '3 4\n1 3 5\nSUM 0 2\nUPDATE 1 2\nSUM 0 2\nSUM 1 2', output: '9\n8\n7' }
    ],
    hiddenTestCases: [
      { input: '1 2\n5\nSUM 0 0\nUPDATE 0 10', output: '5' }
    ],
    editorial: 'Segment Tree or Fenwick Tree (Binary Indexed Tree) supports point updates in O(log N) and range sum queries in O(log N). Time: O(Q log N), Space: O(N).'
  }
];

async function seedDSABank() {
  await db.initializeDatabase();
  console.log('🔄 Cleaning up duplicate and draft problems from Database...');

  // Delete duplicate or poorly structured questions (e.g. Generated Problem, Fruit Market copies, etc.)
  const deleted = await db.Problem.deleteMany({
    $or: [
      { title: { $regex: /Generated Problem/i } },
      { title: { $regex: /Fruit Market/i } },
      { title: { $regex: /Mysterious Temple/i } },
      { title: { $regex: /Copy/i } },
      { title: { $regex: /Chef's Recipe/i } },
      { title: { $regex: /Treasure Chest/i } },
      { title: { $regex: /Alice's Fruit/i } },
      { title: { $regex: /Mountain Expedition/i } }
    ]
  });
  console.log(`🧹 Removed ${deleted.deletedCount} low-quality / duplicate problem records.`);

  console.log(`🌱 Inserting ${DSA_PROBLEMS.length} curated Data Structure & Algorithm problems...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const prob of DSA_PROBLEMS) {
    const existing = await db.Problem.findOne({ title: prob.title });
    if (existing) {
      // Update with rich fields
      Object.assign(existing, prob);
      await existing.save();
      updatedCount++;
    } else {
      await db.Problem.create({
        ...prob,
        submissions: Math.floor(12 + Math.random() * 80),
        acceptance: Math.floor(45 + Math.random() * 40)
      });
      insertedCount++;
    }
  }

  const totalNow = await db.Problem.countDocuments();
  console.log(`✅ Seeding Complete! Inserted: ${insertedCount}, Updated: ${updatedCount}, Total Problems in Bank: ${totalNow}`);
  process.exit(0);
}

seedDSABank().catch(err => {
  console.error('❌ Seeding Error:', err);
  process.exit(1);
});
