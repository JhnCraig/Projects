<?php
require_once "../config/database.php";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Add New Project - SBDC Admin</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            margin: 0;
            padding: 40px;
        }

        .container {
            max-width: 700px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 3px 15px rgba(0,0,0,0.1);
        }

        h1 {
            margin-bottom: 25px;
        }

        label {
            display: block;
            margin-top: 15px;
            margin-bottom: 6px;
            font-weight: bold;
        }

        input,
        textarea,
        select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-sizing: border-box;
        }

        textarea {
            height: 120px;
            resize: vertical;
        }

        input[type="file"] {
            padding: 8px;
        }

        button {
            margin-top: 25px;
            padding: 12px 25px;
            background: #002850;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

        button:hover {
            opacity: 0.9;
        }

        .back {
            display: inline-block;
            margin-bottom: 20px;
            text-decoration: none;
            color: #002850;
        }
    </style>
</head>

<body>

<div class="container">

    <a href="index.php" class="back">← Back to Dashboard</a>

    <h1>Add New Project</h1>

    <form action="save_project.php" method="POST" enctype="multipart/form-data">

        <label for="title">Project Title</label>
        <input type="text" id="title" name="title" required>


        <label for="description">Description</label>
        <textarea id="description" name="description" required></textarea>


        <label for="location">Location</label>
        <input type="text" id="location" name="location">


        <label for="status">Status</label>
        <select id="status" name="status">
            <option value="Completed">Completed</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Upcoming">Upcoming</option>
        </select>


        <label for="images">Project Photos</label>
        <input
            type="file"
            id="images"
            name="images[]"
            accept="image/*"
            multiple
            required
        >

        <button type="submit">
            Add Project
        </button>

    </form>

</div>

</body>
</html>