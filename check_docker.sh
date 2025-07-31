#!/bin/bash

echo "=========================================="
echo "Docker Configuration Check"
echo "=========================================="
echo ""

# Check if Docker is running
echo "1. Checking Docker daemon:"
if docker info >/dev/null 2>&1; then
    echo "   ✅ Docker is running"
    echo "   Docker version: $(docker --version)"
else
    echo "   ❌ Docker is not running or not accessible"
    echo "   Please start Docker Desktop or Docker daemon"
    exit 1
fi
echo ""

# Check Docker socket
echo "2. Checking Docker socket:"
if [ -S "/var/run/docker.sock" ]; then
    echo "   ✅ Docker socket exists at /var/run/docker.sock"
    ls -la /var/run/docker.sock
else
    echo "   ❌ Docker socket not found at /var/run/docker.sock"
fi
echo ""

# Check Docker permissions
echo "3. Checking Docker permissions:"
if groups | grep -q docker || [ "$USER" = "root" ]; then
    echo "   ✅ User has docker group access or is root"
else
    echo "   ⚠️  User may not have docker group access"
    echo "   You might need to run: sudo usermod -aG docker $USER"
fi
echo ""

# Check runtime image
echo "4. Checking OpenHands runtime image:"
RUNTIME_IMAGE="ghcr.io/all-hands-ai/runtime:oh_v0.50.0_t2h0d1xmsx5pxmch"
if docker images | grep -q "all-hands-ai/runtime.*oh_v0.50.0_t2h0d1xmsx5pxmch"; then
    echo "   ✅ Runtime image is available locally"
else
    echo "   ⚠️  Runtime image not found locally"
    echo "   It will be pulled when first needed"
fi
echo ""

# Test Docker run
echo "5. Testing Docker container creation:"
if docker run --rm hello-world >/dev/null 2>&1; then
    echo "   ✅ Docker can create and run containers"
else
    echo "   ❌ Docker cannot create containers"
    echo "   Check Docker logs for errors"
fi
echo ""

echo "=========================================="
echo "SUMMARY:"
if docker info >/dev/null 2>&1; then
    echo "✅ Docker is properly configured"
    echo "✅ Ready to run OpenHands with Docker runtime"
else
    echo "❌ Docker is not properly configured"
    echo "❌ Please fix Docker issues before running OpenHands"
fi
echo "=========================================="