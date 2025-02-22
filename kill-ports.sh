#!/bin/bash
lsof -i :5173 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
lsof -i :8080 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null