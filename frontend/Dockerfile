FROM node:20-alpine

WORKDIR /app

# Copy only package descriptors first (cache layer)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
