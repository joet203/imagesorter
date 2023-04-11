const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const imageDir = 'S:/sdsd'; // Change this to your image directory
const categorizedDir = 'S:/categorized'; // Change this to your categorized directory

// Update the middleware to serve files from the new directory
app.use('/images', express.static(imageDir));
app.use('/categorized', express.static(categorizedDir));

app.use(express.static('public'));

let seenFilenames = new Set();

app.use(express.static('public'));

app.get('/api/image', (req, res) => {
    const count = req.query.count ? parseInt(req.query.count) : 1;

    fs.readdir(imageDir, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading image directory');
            return;
        }

        const imageFiles = files
            .filter(file => file.isFile() && !seenFilenames.has(file.name))
            .map(file => ({
                filename: file.name,
                path: path.join(imageDir, file.name),
            }));

        // Sort image files by modified time in descending order
        imageFiles.sort((a, b) => {
            return fs.statSync(b.path).mtimeMs - fs.statSync(a.path).mtimeMs;
        });

        const selectedImages = imageFiles.slice(0, count).map(file => {
            seenFilenames.add(file.filename);
            return {
                filename: file.filename,
                imageUrl: path.join('/images', file.filename),
            };
        });

        res.json(selectedImages);
    });
});

const upload = multer();
app.post('/api/categorize', upload.none(), (req, res) => {
    const category = req.body.category;
    const filename = req.body.filename;
    const sourcePath = path.join(imageDir, filename);
    const destDir = path.join(categorizedDir, category);

    // Check if the source file exists
    if (!fs.existsSync(sourcePath)) {
        console.error(`Source file not found: ${sourcePath}`);
        res.status(400).send('Source file not found');
        return;
    }

    // Create the destination directory if it doesn't exist
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, filename);

    // Rename (move) the file
    fs.rename(sourcePath, destPath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error moving file');
            return;
        }

        res.status(200).send('File moved successfully');
    });
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
