-- Dad Jokes Database Initialization
-- This script runs automatically when the PostgreSQL container starts for the first time.

CREATE TABLE IF NOT EXISTS jokes (
    id SERIAL PRIMARY KEY,
    setup TEXT NOT NULL,
    punchline TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    rating NUMERIC(3,2) DEFAULT 0.00,
    times_told INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed with some classic dad jokes
INSERT INTO jokes (setup, punchline, category) VALUES
('Why don''t scientists trust atoms?', 'Because they make up everything!', 'science'),
('What do you call a fake noodle?', 'An impasta!', 'food'),
('Why did the scarecrow win an award?', 'He was outstanding in his field!', 'work'),
('I''m reading a book about anti-gravity.', 'It''s impossible to put down!', 'science'),
('What do you call a bear with no teeth?', 'A gummy bear!', 'animals'),
('Why don''t eggs tell jokes?', 'They''d crack each other up!', 'food'),
('I used to hate facial hair...', 'But then it grew on me.', 'general'),
('What did the ocean say to the beach?', 'Nothing, it just waved.', 'nature'),
('Why do cows have hooves instead of feet?', 'Because they lactose!', 'animals'),
('What do you call a dog that does magic tricks?', 'A Labracadabrador!', 'animals'),
('I''m on a seafood diet.', 'I see food and I eat it.', 'food'),
('Why couldn''t the bicycle stand up by itself?', 'It was two tired!', 'general'),
('What did the grape do when he got stepped on?', 'Nothing, he just let out a little wine.', 'food'),
('I would avoid the sushi if I were you.', 'It''s a little fishy.', 'food'),
('Want to hear a joke about construction?', 'I''m still working on it.', 'work'),
('Why do fathers take an extra pair of socks when they go golfing?', 'In case they get a hole in one!', 'sports'),
('What do you call a lazy kangaroo?', 'A pouch potato!', 'animals'),
('I got carded at a liquor store, and my Blockbuster card accidentally fell out.', 'The cashier said never mind.', 'general'),
('Why do programmers prefer dark mode?', 'Because light attracts bugs!', 'tech'),
('There are only 10 kinds of people in this world.', 'Those who understand binary and those who don''t.', 'tech');
