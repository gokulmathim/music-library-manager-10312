#!/bin/bash
cd /home/kavia/workspace/code-generation/music-library-manager-10312/music_library_backend
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

