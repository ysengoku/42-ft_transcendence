-- Créer une table utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Insérer des données par défaut
INSERT INTO users (username, email, password) VALUES 
('admin', 'admin@example.com', 'hashedpassword123'),
('user1', 'user1@example.com', 'hashedpassword456');

-- Créer une table de rôles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL
);

-- Insérer des données par défaut dans la table des rôles
INSERT INTO roles (role_name) VALUES 
('admin'),
('user');

-- Relier les utilisateurs à des rôles via une table d'association
CREATE TABLE user_roles (
    user_id INT REFERENCES users(id),
    role_id INT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- Assigner un rôle à l'utilisateur admin
INSERT INTO user_roles (user_id, role_id) VALUES 
(1, 1);  -- admin -> admin role
