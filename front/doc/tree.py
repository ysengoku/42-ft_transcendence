import os
import sys

# Set up the default root directory, or get from an environment variable or command line argument
root = sys.argv[1]

# Number of spaces to add for indentation
spaces = '   '

def tree(dir_path, prefix='', show_dirs_only=False):
    # Check if dir_path is a directory before attempting to list its contents
    if not os.path.isdir(dir_path):
        return []
    
    entries = sorted(os.listdir(dir_path))
    lines = []
    for i, entry in enumerate(entries):
        path = os.path.join(dir_path, entry)

        # Only show directories in the public/ directory
        if show_dirs_only and not os.path.isdir(path):
            continue

        connector = '└── ' if i == len(entries) - 1 else '├── '
        lines.append(f"{prefix}{connector}{entry}{spaces}")  # Add spaces dynamically
        
        # Recursively list subdirectories (only for directories)
        extension = '    ' if i == len(entries) - 1 else '│   '
        
        # If the current directory is public/, set show_dirs_only to True for its contents
        if 'public' in path:
            lines.extend(tree(path, prefix + extension, show_dirs_only=True))
        else:
            lines.extend(tree(path, prefix + extension, show_dirs_only=False))

    return lines

if __name__ == "__main__":
    output = [os.path.basename(root) + f'{spaces}'] + tree(root)
    with open("PROJECT_TREE.md", "w") as f:
        f.write("```\n")
        f.write("\n".join(output))
        f.write("\n```")
    print("✅ Project tree written to PROJECT_TREE.md")

# Usage
# python3 script_name.py /path/to/your/project
# This will create a markdown file named PROJECT_TREE.md in the current directory
