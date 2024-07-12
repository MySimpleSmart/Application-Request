$(document).ready(function() {
    const requiredFields = $('input[required], select[required], textarea[required]');
    const radioGroups = new Set();
    requiredFields.each(function() {
        if ($(this).attr('type') === 'radio') {
            radioGroups.add($(this).attr('name'));
        }
    });

    function updateProgressBar() {
        let filledFields = 0;
        const checkedRadioGroups = new Set();

        requiredFields.each(function() {
            if ($(this).attr('type') === 'radio') {
                if ($('input[name="' + $(this).attr('name') + '"]:checked').length > 0) {
                    checkedRadioGroups.add($(this).attr('name'));
                }
            } else if ($(this).val() && $(this).is(':visible')) {
                filledFields++;
            }
        });

        filledFields += checkedRadioGroups.size;

        let totalFields = requiredFields.length - radioGroups.size + checkedRadioGroups.size;

        if ($('#usdLoanAmountField').is(':visible')) {
            totalFields += 1;
        } else if ($('#mntLoanAmountField').is(':visible')) {
            totalFields += 1;
        }

        const progressPercentage = Math.floor((filledFields / totalFields) * 100);

        // Ensure progress is 100% when all fields are filled
        if (filledFields === totalFields) {
            $('#progressBar').css('width', '100%').attr('aria-valuenow', 100).text('100%');
        } else {
            $('#progressBar').css('width', progressPercentage + '%').attr('aria-valuenow', progressPercentage).text(progressPercentage + '%');
        }
    }

    requiredFields.on('input change', function() {
        updateProgressBar();
    });

    $('#loanType').change(function() {
        const loanType = $(this).val();
        toggleLoanAmountFields(loanType);
        updateProgressBar();
    });

    function toggleLoanAmountFields(loanType) {
        if (loanType === 'usdLoan' || loanType === 'carLoan') {
            $('#usdLoanAmountField').show();
            $('#mntLoanAmountField').hide();
            $('#usdLoanAmount').attr('required', true).attr('min', 3000);
            $('#mntLoanAmount').removeAttr('required');
        } else if (loanType === 'mntLoan') {
            $('#mntLoanAmountField').show();
            $('#usdLoanAmountField').hide();
            $('#mntLoanAmount').attr('required', true);
            $('#usdLoanAmount').removeAttr('required');
        } else {
            $('#usdLoanAmountField').hide();
            $('#mntLoanAmountField').hide();
            $('#usdLoanAmount').removeAttr('required');
            $('#mntLoanAmount').removeAttr('required');
        }
    }

    $('#usdLoanAmount').on('input', function() {
        validateUsdLoanAmount(this);
        updateProgressBar();
    });

    function validateUsdLoanAmount(input) {
        let value = input.value.replace(/,/g, '');
        value = parseInt(value, 10);
        if (isNaN(value)) {
            input.value = '';
            input.setCustomValidity("Хамгийн багадаа $3000 байх ёстой.");
            return;
        }
        if (value < 3000) {
            input.setCustomValidity("Хамгийн багадаа $3000 байх ёстой.");
        } else {
            input.setCustomValidity("");
        }
        input.value = value.toLocaleString();
    }

    $('#mntLoanAmount').on('input', function() {
        updateProgressBar();
    });

    $('#passportImages, #bankStatement').on('change', function() {
        updateFileList(this, $(this).attr('id') === 'passportImages' ? '#passportImagesList' : '#bankStatementList');
        updateProgressBar();
    });

    function updateFileList(input, listSelector) {
        const fileList = $(listSelector);

        if (input.files.length > 0) {
            for (let i = 0; i < input.files.length; i++) {
                const file = input.files[i];
                const listItem = $('<tr></tr>').data('filename', file.name);
                const fileSize = (file.size / 1024).toFixed(2) + ' KB';

                listItem.append('<td>' + file.name + '</td>');
                listItem.append('<td>' + fileSize + '</td>');

                const actions = $('<td class="file-actions"></td>');
                const viewButton = $('<button type="button" class="btn btn-primary btn-sm">Харах</button>');
                viewButton.on('click', function() {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        if (file.type === 'application/pdf') {
                            showPDFPreview(e.target.result);
                        } else {
                            showFilePreview(e.target.result, file.type.startsWith('image/'));
                        }
                    };
                    reader.readAsDataURL(file);
                });
                const removeButton = $('<button type="button" class="btn btn-danger btn-sm">Файл устгах</button>');
                removeButton.on('click', function() {
                    removeFile(input, file.name, listItem);
                    updateProgressBar();
                });

                actions.append(viewButton).append(removeButton);
                listItem.append(actions);
                fileList.append(listItem);
            }
        }
    }

    function removeFile(input, fileName, listItem) {
        const dt = new DataTransfer();
        const files = input.files;

        for (let i = 0; i < files.length; i++) {
            if (files[i].name !== fileName) {
                dt.items.add(files[i]);
            }
        }

        input.files = dt.files;
        listItem.remove();

        if (input.files.length === 0) {
            $(input).removeClass('is-valid').addClass('is-invalid');
        }
    }

    function showFilePreview(fileUrl, isImage) {
        const content = isImage ? '<img src="' + fileUrl + '" class="img-fluid" />' : '<iframe src="' + fileUrl + '" frameborder="0" style="width:100%; height:100%;"></iframe>';
        $('#filePreviewContent').html(content).removeClass('pdfViewer').addClass('imageViewer');
        $('#filePreviewModal .custom-modal-content').removeClass('pdfViewer').css('overflow-y', 'hidden');
        $('#filePreviewModal').fadeIn();
    }

    function showPDFPreview(pdfDataUrl) {
        const loadingTask = pdfjsLib.getDocument({ data: atob(pdfDataUrl.split(',')[1]) });
        loadingTask.promise.then(function(pdf) {
            const viewer = $('<div id="pdf-viewer" class="pdfViewer"></div>');
            $('#filePreviewContent').html(viewer).removeClass('imageViewer').addClass('pdfViewer');
            $('#filePreviewModal .custom-modal-content').addClass('pdfViewer').css('overflow-y', 'auto');
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                pdf.getPage(pageNum).then(function(page) {
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale: scale });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    viewer.append(canvas);

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    page.render(renderContext);
                });
            }
            $('#filePreviewModal').fadeIn();
        });
    }

    // Close modal on ESC key or click outside the modal content
    $(document).on('keydown', function(event) {
        if (event.key === 'Escape') {
            $('#filePreviewModal').fadeOut();
            $('#termsModal').fadeOut();
        }
    });

    $(document).on('click', function(event) {
        if ($(event.target).is('#filePreviewModal')) {
            $('#filePreviewModal').fadeOut();
        }
        if ($(event.target).is('#termsModal')) {
            $('#termsModal').fadeOut();
        }
    });

    $('#clearFormButton').click(function() {
        clearForm();
    });

    function clearForm() {
        $('#loanForm')[0].reset();
        $('#loanForm').removeClass('was-validated');
        $('#loanForm').find('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
        $('#usdLoanAmountField, #mntLoanAmountField').hide();
        $('.file-list').empty();
        $('#progressBar').css('width', '0%').attr('aria-valuenow', 0).text('0%');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $('#loanForm').submit(function(event) {
        event.preventDefault();
        if (this.checkValidity() === false) {
            event.stopPropagation();
            const firstInvalidField = $('input:invalid, select:invalid, textarea:invalid').first();
            $('html, body').animate({ scrollTop: firstInvalidField.offset().top - 20 }, 500);
            firstInvalidField.focus();
            showNotification('danger', 'Бүх шаардлагатай талбаруудыг бөглөнө үү.');
        } else {
            handleFormSubmit();
        }
        this.classList.add('was-validated');
    });

    function handleFormSubmit() {
        try {
            $('#submitBtn .spinner-border').removeClass('d-none');
            $('#submitBtn').attr('disabled', true);

            setTimeout(() => {
                $('#submitBtn .spinner-border').addClass('d-none');
                $('#submitBtn').attr('disabled', false);
                showNotification('success', 'Таны мэдээлэл амжилттай илгээгдлээ.');
                $('#progressBar').css('width', '100%').attr('aria-valuenow', 100).text('100%');
                clearForm();
            }, 2000);
        } catch (error) {
            showNotification('danger', 'Мэдээлэл илгээхэд алдаа гарлаа. Дахин оролдоно уу.');
            console.error(error);
        }
    }

    function showNotification(type, message) {
        const notification = $('#notification');
        notification.removeClass('d-none alert-success alert-danger').addClass('alert-' + type).text(message);
        notification.fadeIn().delay(3000).fadeOut();
    }

    $('input[required], select[required], textarea[required]').on('input change', function() {
        validateField(this);
        updateProgressBar();
    });

    function validateField(field) {
        if (field.checkValidity()) {
            $(field).removeClass('is-invalid').addClass('is-valid');
        } else {
            $(field).removeClass('is-valid').addClass('is-invalid');
        }
    }

    const autocomplete = new google.maps.places.Autocomplete(document.getElementById('homeAddress'), {
        types: ['geocode'],
        componentRestrictions: { country: 'au' }
    });

    $('#progressBar').css('width', '0%').attr('aria-valuenow', 0).text('0%');

    $('#openTermsModal').on('click', function(event) {
        event.preventDefault();
        $('#termsModal').fadeIn();
    });

    $('#relativeName').on('input', function() {
        validateRelativeName(this);
    });

    function validateRelativeName(input) {
        const value = input.value.trim();
        if (!/^[А-Яа-яӨөҮү]+\s+[А-Яа-яӨөҮү]+$/.test(value)) {
            input.setCustomValidity('Овог, Нэр хоёрыг заавал оруулах ёстой.');
        } else {
            input.setCustomValidity('');
        }
    }
});