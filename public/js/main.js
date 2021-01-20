/* eslint-env jquery, browser */
$(document).ready(() => {

  // Place JavaScript code here...
  function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  let tempLanguage = getCookie('i18next')

  if (tempLanguage === 'en'){
    $('#lang1').html("English")
    $('#lang1').val('en')

    $('#lang2').html("Tiếng Việt")
    $('#lang2').val('vi')

  } else {
    $('#lang1').html("Tiếng Việt")
    $('#lang1').val('vi')

    $('#lang2').html("English")
    $('#lang2').val('en')

  }
  
  $('.languageOption').change(function() {
    let selectedLanguage = $(this).children("option:selected").val()
    var tempUrl =  window.location.href.split('?')[0];
    window.location.href = tempUrl + "?lng=" + selectedLanguage
  })

  //Delete contact action
  $("#delete-btn").click(function () {
    contact_id = $('#delete-item').text();

    $.ajaxSetup({
      headers: { 'X-CSRF-Token': $('input[name="_csrf"]').attr('value') }
    });

    $.ajax({
      url: "/contact-management/delete/" + contact_id,
      type: 'DELETE',
      beforeSend: function () {
        $('#' + contact_id).addClass('table-danger');
      },
      success: function (res) {
        $('#delete-modal').modal('hide');
        $('#' + contact_id).fadeOut();
        $('#' + contact_id).remove();
      },
      error: function (error) {
        $('#' + '#delete-modal').modal('hide');
        $('#' + contact_id).removeClass('table-danger');
      }
    })
  });

  $("#delete-multiple-inner-btn").click(function () {
    var deleteContactIdList = []
    $('.checkbox:checked').each(function () {
      deleteContactIdList.push($(this).attr('id'))
    })

    $.ajaxSetup({
      headers: { 'X-CSRF-Token': $('input[name="_csrf"]').attr('value') }
    });

    $.ajax({
      url: "/contact-management/delete-multiple/",
      type: 'DELETE',
      data: {
        idList: deleteContactIdList
      },

      beforeSend: function () {
        deleteContactIdList.forEach(id => {
          $('#' + id).addClass('table-danger');
        });
      },

      success: function (res) {
        $('#delete-multiple-modal').modal('hide');
        $('#delete-multiple-btn').css('display', 'none')
        deleteContactIdList.forEach(id => {
          $('#' + id).fadeOut();
          $('#' + id).remove();
        });
      },

      error: function (error) {
        $('#delete-multiple-modal').modal('hide');
        deleteContactIdList.forEach(id => {
          $('#' + id).removeClass('table-danger');
        });
      }
    })
  });
})

function deleteContact(contact_id) {
  $('#delete-item').text(contact_id);
}

function checkBoxToggle() {
  if ($('.checkbox:checked').length > 0) {
    $('#delete-multiple-btn').css('display', 'block')
  } else {
    $('#delete-multiple-btn').css('display', 'none')
  }
}

