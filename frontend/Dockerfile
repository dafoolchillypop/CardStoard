FROM node:18

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY ./src /app/src

# Expose frontend port
EXPOSE 3000

# Run React dev server
CMD ["npm", "start"]

