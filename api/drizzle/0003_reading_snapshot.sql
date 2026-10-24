ALTER TABLE `readings`
  ADD `captured` int NOT NULL DEFAULT 0,
  ADD `rider` enum('child','teen','adult'),
  ADD `height_cm` int,
  ADD `inseam_cm` int,
  ADD `crank_mm` int,
  ADD `saddle_mm` int,
  ADD `stem_mm` int,
  ADD `drop_mm` int;
