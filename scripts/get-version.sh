#!/bin/bash

get_version() {
    # Check if we're exactly on a tag
    local tag_match=$(git describe --exact-match --tags --match 'v*' HEAD 2>/dev/null)
    if [ -n "$tag_match" ]; then
        echo "$tag_match"
        return
    else
        local last_tag=$(git describe --tags --match 'v*' --abbrev=0 2>/dev/null)
        
        if [ -z "$last_tag" ]; then
            echo "v0.0.0-$(git rev-parse --short HEAD)"
            return
        fi
        
        local commits_ahead=$(git rev-list --count ${last_tag}..HEAD)
        
        if [ "$commits_ahead" -eq 0 ]; then
            echo "$last_tag"
            exit 0
        else
            local version_part=$(echo "$last_tag" | sed 's/^v//' | sed 's/-.*//')
            local major=$(echo "$version_part" | cut -d. -f1)
            local minor=$(echo "$version_part" | cut -d. -f2)
            local patch=$(echo "$version_part" | cut -d. -f3)
            
            if [ -z "$patch" ]; then
                patch=0
            fi
            
            patch=$((patch + 1))
            
            local commit_hash=$(git rev-parse --short HEAD)
            echo "v${major}.${minor}.${patch}-p${commits_ahead}-${commit_hash}"
        fi
    fi
}

get_version