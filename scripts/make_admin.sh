#!/bin/bash
# Script to promote a user to ADMIN role via PostgreSQL
# Usage: ./scripts/make_admin.sh <username>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <username>"
    echo ""
    echo "Example: $0 myuser"
    exit 1
fi

USERNAME="$1"

# Check if docker-compose is available and postgres container exists
if command -v docker-compose &> /dev/null && docker-compose ps postgres &> /dev/null; then
    echo "Using Docker Compose..."
    docker-compose exec -T postgres psql -U egilsmap -d egilsmap <<EOF
-- Check if user exists
DO \$\$
DECLARE
    user_exists boolean;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE username = '$USERNAME') INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User % not found', '$USERNAME';
    END IF;
    
    -- Update role to ADMIN
    UPDATE users SET role = 'ADMIN' WHERE username = '$USERNAME';
    
    RAISE NOTICE 'Successfully promoted % to ADMIN role', '$USERNAME';
END \$\$;

-- Verify the change
SELECT id, username, email, role FROM users WHERE username = '$USERNAME';
EOF
else
    echo "Docker Compose not available. Using direct PostgreSQL connection..."
    echo "Make sure PostgreSQL is running and accessible."
    PGPASSWORD=egilsmap_secret psql -U egilsmap -d egilsmap -h localhost -p 5433 <<EOF
-- Check if user exists and update role
DO \$\$
DECLARE
    user_exists boolean;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE username = '$USERNAME') INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User % not found', '$USERNAME';
    END IF;
    
    -- Update role to ADMIN
    UPDATE users SET role = 'ADMIN' WHERE username = '$USERNAME';
    
    RAISE NOTICE 'Successfully promoted % to ADMIN role', '$USERNAME';
END \$\$;

-- Verify the change
SELECT id, username, email, role FROM users WHERE username = '$USERNAME';
EOF
fi
