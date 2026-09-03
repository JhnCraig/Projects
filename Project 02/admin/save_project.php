<?php

require_once "../config/database.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: add_project.php");
    exit;
}

// Get project information
$title = trim($_POST["title"] ?? "");
$description = trim($_POST["description"] ?? "");
$location = trim($_POST["location"] ?? "");
$status = trim($_POST["status"] ?? "");

// Check required fields
if ($title === "" || $description === "") {
    die("Project title and description are required.");
}

// Save project information
$stmt = $conn->prepare("
    INSERT INTO projects (title, description, location, status)
    VALUES (?, ?, ?, ?)
");

$stmt->bind_param(
    "ssss",
    $title,
    $description,
    $location,
    $status
);

$stmt->execute();

$project_id = $conn->insert_id;

$stmt->close();


// Create upload folder if it doesn't exist
$upload_dir = "../uploads/projects/";

if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}


// Upload project images
if (isset($_FILES["images"]) && !empty($_FILES["images"]["name"][0])) {

    $allowed_types = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    foreach ($_FILES["images"]["name"] as $key => $original_name) {

        if ($_FILES["images"]["error"][$key] !== UPLOAD_ERR_OK) {
            continue;
        }

        $tmp_name = $_FILES["images"]["tmp_name"][$key];
        $file_type = mime_content_type($tmp_name);

        // Only allow images
        if (!in_array($file_type, $allowed_types)) {
            continue;
        }

        // Get file extension
        $extension = strtolower(
            pathinfo($original_name, PATHINFO_EXTENSION)
        );

        // Create unique filename
        $new_filename = uniqid("project_", true) . "." . $extension;

        $destination = $upload_dir . $new_filename;

        // Move uploaded image
        if (move_uploaded_file($tmp_name, $destination)) {

            // Save image information in database
            $image_stmt = $conn->prepare("
                INSERT INTO project_images (project_id, image)
                VALUES (?, ?)
            ");

            $image_stmt->bind_param(
                "is",
                $project_id,
                $new_filename
            );

            $image_stmt->execute();
            $image_stmt->close();
        }
    }
}

$conn->close();

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Project Added</title>
</head>

<body>

    <h1>Project Added Successfully!</h1>

    <p>
        The project and its pictures have been saved.
    </p>

    <a href="add_project.php">Add Another Project</a>

    <br><br>

    <a href="index.php">Back to Admin Dashboard</a>

</body>
</html>