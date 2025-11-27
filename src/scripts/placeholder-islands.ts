function replacePlaceholders() {
  // Get all elements with placeholder-id attribute
  const placeholders = document.querySelectorAll('[placeholder-id]');
  
//   console.log(`Found ${placeholders.length} placeholders to process`);
  
  // If no placeholders found, return false to stop the interval
  if (placeholders.length === 0) {
    // console.log('No more placeholders to process, stopping interval');
    return false;
  }

  // Loop through each placeholder
  placeholders.forEach((placeholder) => {
    const placeholderId = placeholder.getAttribute('placeholder-id');
    if (!placeholderId) return;

    // Find the corresponding React component
    const reactComponent = document.querySelector(`[island-id="${placeholderId}"]`);
    if (!reactComponent) {
    //   console.log(`React component not found for placeholder: ${placeholderId}`);
      return;
    }

    // console.log(`Replacing placeholder ${placeholderId} with React component`);
    
    // Remove the placeholder from DOM
    placeholder.remove();
    
    // Remove the hidden class from the React component
    reactComponent.classList.remove('hidden');
    
    // console.log(`Successfully replaced ${placeholderId}`);
  });

  // Return true to continue the interval if there are still placeholders
  return placeholders.length > 0;
}

console.log('Starting placeholder replacement interval');
// Start the interval to check for placeholders
const interval = setInterval(() => {
  const shouldContinue = replacePlaceholders();
  if (!shouldContinue) {
    // console.log('All placeholders have been replaced, clearing interval');
    clearInterval(interval);
  }
}, 100);
