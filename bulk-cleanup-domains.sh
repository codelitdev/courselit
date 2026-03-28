#!/bin/bash

# Tool to run the domain cleanup script for a list of domains provided in a file.
# Each domain should be on a new line in the input file.

if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_domains_list_file>"
  exit 1
fi

FILE=$1

if [ ! -f "$FILE" ]; then
  echo "Error: File $FILE not found."
  exit 1
fi

echo "Starting bulk cleanup..."

while IFS= read -r domain || [ -n "$domain" ]; do
  # Trim potential whitespace or carriage returns (common in files exported from Excel)
  domain=$(echo "$domain" | tr -d '\r' | xargs)
  
  if [ -z "$domain" ]; then
    continue
  fi

  echo "--------------------------------------------------"
  echo "Cleaning up domain: $domain"
  pnpm --filter @courselit/scripts domain:cleanup "$domain"
done < "$FILE"

echo "--------------------------------------------------"
echo "Bulk cleanup process completed."
