document.addEventListener('DOMContentLoaded', function() {
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const emailInput = document.getElementById('email');
  const errorDiv = document.getElementById('forgot-error');
  const successDiv = document.getElementById('forgot-success');

  // Function to show error message
  function showError(message) {
      console.error('Error:', message);
      errorDiv.textContent = message;
      errorDiv.classList.remove('d-none');
      successDiv.classList.add('d-none');
  }

  // Function to show success message
  function showSuccess(message) {
      console.log('Success:', message);
      successDiv.textContent = message;
      successDiv.classList.remove('d-none');
      errorDiv.classList.add('d-none');
  }

  forgotPasswordForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      
      // Validate email
      if (!email) {
          showError('Please enter an email address');
          return;
      }

      // Reset previous messages
      errorDiv.classList.add('d-none');
      successDiv.classList.add('d-none');

      // Attempt password reset
      fetch('/prs/api.php/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
    })
      .then(response => {
          // Log full response details for debugging
          console.log('Response status:', response.status);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));

          // Always attempt to parse JSON, even for error responses
          return response.text().then(text => {
              console.log('Raw response text:', text);
              
              try {
                  const data = JSON.parse(text);
                  return {
                      status: response.status,
                      data: data
                  };
              } catch (parseError) {
                  console.error('JSON Parsing Error:', parseError);
                  throw new Error('Failed to parse JSON: ' + text);
              }
          });
      })
      .then(({ status, data }) => {
          console.log('Parsed response:', { status, data });

          // Check for success scenarios
          if (status === 200 || status === 201) {
              if (data.status === 'success') {
                  showSuccess(data.message);
                  
                  // Optional: Show debug link if available
                  if (data.debug_link) {
                      const debugLink = document.createElement('p');
                      debugLink.innerHTML = `Debug Reset Link: <a href="${data.debug_link}" target="_blank">Reset Link</a>`;
                      successDiv.appendChild(debugLink);
                  }
              } else {
                  // Fallback error handling
                  showError(data.message || 'An unexpected error occurred');
              }
          } else {
              // Error scenarios
              showError(data.message || 'Failed to send password reset request');
          }
      })
      .catch(error => {
          console.error('Fetch Error:', error);
          showError('An unexpected error occurred. Please check the console for details.');
      });
  });
});