def temp_mock_agent(prompt, csv_dir=None, viz_dir=None):
    """
    A temporary mock version of the prompt_agent function that returns 
    pre-prepared visualization files from the temp directory.
    
    Args:
        prompt: The user's prompt (ignored in this mock version)
        csv_dir: Directory for CSV files (where CSV files will be copied)
        viz_dir: Directory for output visualizations (used for copying files)
        
    Returns:
        List of result dictionaries mimicking the structure of the real agent's output
    """
    import os
    import shutil
    import random
    from datetime import datetime
    
    # Path to the temp directory with prepared files
    temp_dir = "agents/temp"
    
    # Check if the temp directory exists
    if not os.path.exists(temp_dir):
        raise FileNotFoundError(f"Temp directory not found at {temp_dir}")
    
    # Ensure CSV directory exists
    if csv_dir and not os.path.exists(csv_dir):
        os.makedirs(csv_dir, exist_ok=True)
    
    # Get all the JS files from the temp directory
    js_files = [f for f in os.listdir(temp_dir) if f.endswith('.js')]
    
    # Get all CSV files from the temp directory
    csv_files = [f for f in os.listdir(temp_dir) if f.endswith('.csv')]
    
    # Create a mapping of base names (without extensions) between JS and CSV files
    # This helps us match corresponding files
    base_name_mapping = {}
    for js_file in js_files:
        base_name = os.path.splitext(js_file)[0]
        matching_csv = f"{base_name}.csv"
        if matching_csv in csv_files:
            base_name_mapping[base_name] = {
                'js_file': js_file,
                'csv_file': matching_csv
            }
    
    if not base_name_mapping:
        raise FileNotFoundError("No matching JS and CSV files found in the temp directory")
    
    # For testing, let's randomly select 1-2 file pairs
    num_pairs = random.randint(1, min(2, len(base_name_mapping)))
    selected_base_names = random.sample(list(base_name_mapping.keys()), num_pairs)
    
    results = []
    
    for base_name in selected_base_names:
        # Generate a timestamp for uniqueness
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Get file info
        js_file = base_name_mapping[base_name]['js_file']
        csv_file = base_name_mapping[base_name]['csv_file']
        
        # Create new filenames to avoid overwriting existing files
        new_js_filename = f"{base_name}_{timestamp}.js"
        new_csv_filename = f"{base_name}_{timestamp}.csv"
        
        # Copy JS file to visualization directory
        js_source_path = os.path.join(temp_dir, js_file)
        js_dest_path = os.path.join(viz_dir, new_js_filename)
        shutil.copy2(js_source_path, js_dest_path)
        
        # Copy CSV file to data directory if provided
        if csv_dir:
            csv_source_path = os.path.join(temp_dir, csv_file)
            csv_dest_path = os.path.join(csv_dir, new_csv_filename)
            shutil.copy2(csv_source_path, csv_dest_path)
            print(f"Copied CSV file to: {csv_dest_path}")
        
        # Create a result entry similar to what the real agent would return
        results.append({
            "result": "success",
            "file_name": new_js_filename,
            "task": f"Visualize {base_name} data",  # Add a mock task description
            "csv_file": new_csv_filename if csv_dir else None
        })
        
        print(f"Created visualization: {new_js_filename} with data from {new_csv_filename if csv_dir else 'no CSV'}")
    
    return results