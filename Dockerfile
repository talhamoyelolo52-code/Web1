# Use Eclipse Temurin (Adoptium) JDK 17 base image with Node.js pre-installed
FROM eclipse-temurin:17-jdk-jammy

# Install Node.js 18
RUN apt-get update -y && \
    apt-get install -y curl ca-certificates gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get install -y maven && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify installations
RUN java -version && node -v && npm -v && mvn -version

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy app files
COPY . .

# Create necessary directories
RUN mkdir -p uploads output

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
