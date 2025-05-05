/**
 * Smart Green House - Common JavaScript Functions
 * Handles loading of reusable components and common functionality
 */

$(document).ready(function() {
  // Load sidebar component
  loadComponent = function(elementId, componentPath, callback) {
    $(elementId).load(componentPath, function() {
      if (callback && typeof callback === 'function') {
        callback();
      }
    });
  };

  // Load header component into head section
  loadHeader = function(componentPath, pageTitle) {
    $('head').load(componentPath, function() {
      // Add the page-specific title after loading the header component
      document.title = pageTitle || 'Smart Green House';
    });
  };

  // Set active menu based on current page
  setActiveMenu = function(menuId) {
    $('.sidebar-menu a').removeClass('active');
    $('#' + menuId).addClass('active');
  };

  // Toggle sidebar functionality
  $(document).on('click', '#toggle-sidebar', function() {
    $('#sidebar').toggleClass('collapsed');
    $('#main-content').toggleClass('expanded');
  });

  // Handle logout
  $(document).on('click', '#nav-logout', function(e) {
    e.preventDefault();
    
    $.post('/auth/logout', function(response) {
      if (response.success) {
        window.location.href = '/login.html';
      } else {
        alert('Lỗi khi đăng xuất. Vui lòng thử lại.');
      }
    });
  });
});