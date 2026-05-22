const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Upload directory
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Create directories
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Multer config for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sessionId = Date.now().toString();
        const sessionPath = path.join(UPLOAD_DIR, sessionId);
        fs.mkdirSync(sessionPath, { recursive: true });
        cb(null, sessionPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Minecraft Plugin Compiler Running!' });
});

// Upload and compile Java files
app.post('/api/compile', upload.array('files'), async (req, res) => {
    const sessionId = path.basename(req.files[0].destination);
    const sessionPath = path.join(UPLOAD_DIR, sessionId);
    const outputPath = path.join(OUTPUT_DIR, sessionId);
    fs.mkdirSync(outputPath, { recursive: true });

    try {
        // Check if pom.xml exists (Maven project)
        const hasPom = fs.existsSync(path.join(sessionPath, 'pom.xml'));

        // Check if build.gradle exists (Gradle project)
        const hasGradle = fs.existsSync(path.join(sessionPath, 'build.gradle'));

        let compileCommand;
        let jarPath;

        if (hasPom) {
            // Maven project
            compileCommand = `cd "${sessionPath}" && mvn clean package -DskipTests`;
            jarPath = path.join(sessionPath, 'target', '*.jar');
        } else if (hasGradle) {
            // Gradle project
            compileCommand = `cd "${sessionPath}" && ./gradlew build`;
            jarPath = path.join(sessionPath, 'build', 'libs', '*.jar');
        } else {
            // Simple Java project - manual compile
            const javaFiles = req.files
                .filter(f => f.originalname.endsWith('.java'))
                .map(f => f.originalname)
                .join(' ');

            if (!javaFiles) {
                return res.status(400).json({ error: 'No .java files found!' });
            }

            compileCommand = `cd "${sessionPath}" && javac -d . ${javaFiles} && jar cvf plugin.jar *.class`;
            jarPath = path.join(sessionPath, 'plugin.jar');
        }

        // Execute compile command
        console.log(`[${sessionId}] Compiling: ${compileCommand}`);

        exec(compileCommand, { timeout: 120000 }, (error, stdout, stderr) => {
            const logs = stdout + '\n' + stderr;

            if (error && !fs.existsSync(jarPath.replace('*', ''))) {
                return res.status(500).json({
                    success: false,
                    error: 'Compilation failed!',
                    logs: logs,
                    sessionId: sessionId
                });
            }

            // Find generated JAR file
            const findJar = () => {
                if (hasPom) {
                    const targetDir = path.join(sessionPath, 'target');
                    if (fs.existsSync(targetDir)) {
                        const jars = fs.readdirSync(targetDir).filter(f => f.endsWith('.jar') && !f.includes('sources') && !f.includes('javadoc'));
                        if (jars.length > 0) return path.join(targetDir, jars[0]);
                    }
                } else if (hasGradle) {
                    const libsDir = path.join(sessionPath, 'build', 'libs');
                    if (fs.existsSync(libsDir)) {
                        const jars = fs.readdirSync(libsDir).filter(f => f.endsWith('.jar') && !f.includes('sources'));
                        if (jars.length > 0) return path.join(libsDir, jars[0]);
                    }
                } else {
                    if (fs.existsSync(path.join(sessionPath, 'plugin.jar'))) {
                        return path.join(sessionPath, 'plugin.jar');
                    }
                }
                return null;
            };

            const generatedJar = findJar();

            if (generatedJar) {
                const finalJarName = `plugin-${sessionId}.jar`;
                const finalPath = path.join(outputPath, finalJarName);
                fs.copyFileSync(generatedJar, finalPath);

                res.json({
                    success: true,
                    message: 'Compilation successful!',
                    jarUrl: `/api/download/${sessionId}/${finalJarName}`,
                    logs: logs,
                    sessionId: sessionId
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'JAR file not found after compilation!',
                    logs: logs,
                    sessionId: sessionId
                });
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Download compiled JAR
app.get('/api/download/:sessionId/:filename', (req, res) => {
    const filePath = path.join(OUTPUT_DIR, req.params.sessionId, req.params.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found!' });
    }

    res.download(filePath, req.params.filename);
});

// Cleanup old files (run every hour)
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    fs.readdirSync(UPLOAD_DIR).forEach(dir => {
        const dirPath = path.join(UPLOAD_DIR, dir);
        const stat = fs.statSync(dirPath);
        if (now - stat.mtimeMs > oneHour) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`Cleaned up: ${dirPath}`);
        }
    });
}, 60 * 60 * 1000);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   Minecraft Plugin Web Compiler          ║
    ║   Server running on port ${PORT}             ║
    ║                                          ║
    ║   Access: http://localhost:${PORT}         ║
    ╚══════════════════════════════════════════╝
    `);
});
