-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 27, 2025 at 04:29 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `yarn_inventory`
--

-- --------------------------------------------------------

--
-- Table structure for table `yarn_stock`
--

CREATE TABLE `yarn_stock` (
  `id` int(11) NOT NULL,
  `yarn_type` varchar(100) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `date_received` date DEFAULT NULL,
  `supplier_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `yarn_stock`
--

INSERT INTO `yarn_stock` (`id`, `yarn_type`, `color`, `quantity`, `unit`, `date_received`, `supplier_name`) VALUES
(1, 'Ring Spun Yarn', 'Grey', 100, '10000', '2025-06-16', 'Myself'),
(2, 'Twistless Yarn', 'Pink', 80, '1600', '2025-06-16', 'Myself'),
(20, 'Cotton', 'brown', 200, '780', '2025-06-22', 'sup1'),
(25, 'Wool', 'Orange', 800, '80', '1989-09-07', 'sup2'),
(26, 'yarn', 'yarn', 4, '9', '1111-11-11', 'sup1'),
(32, 'Nylon', 'yellow', 500, '70', '2025-06-23', 'bob'),
(33, 'Silk yarn', 'Colorful', 300, '30', '2025-06-23', 'Charlie'),
(34, 'Rayon', 'Blue', 300, '40', '2025-06-24', 'David'),
(35, 'Normal yarn', 'Colorful', 400, '23', '2025-06-25', 'sup2'),
(36, 'Cotton', 'brown', 200, '20', '2025-06-28', 'sup2'),
(41, 'yarn', 'yarn', 0, '9', '2025-06-20', 'sup1'),
(47, 'Yarn', 'black&white', 100, '10000', '2025-06-25', 'bob');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `yarn_stock`
--
ALTER TABLE `yarn_stock`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `yarn_stock`
--
ALTER TABLE `yarn_stock`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
