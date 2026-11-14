(function() {
      'use strict';

      var wrapper = document.getElementById('related-posts-wrapper');
      var box = document.getElementById('related-posts-box');
      var labelBox = document.getElementById('related-posts-labels');
      var list = document.getElementById('related-posts-list');
      var status = document.getElementById('related-posts-status');

      if (!wrapper || !box || !labelBox || !list || !status) {
        return;
      }

      if (box.dataset.started === '1') {
        return;
      }

      box.dataset.started = '1';

      /*
       * LABEL YANG DIKECUALIKAN
       * Artikel dengan label ini tidak menampilkan
       * seluruh bagian Postingan Terkait.
       */
      var excludedLabel = 'Daftar Guru'.trim().toLowerCase();

      /*
       * Ambil seluruh label artikel saat ini.
       */
      var labels = Array.from(
        labelBox.querySelectorAll('.related-label')
      ).map(function(el) {
        return el.textContent.trim();
      }).filter(Boolean);

      /*
       * Sembunyikan Postingan Terkait jika artikel
       * memiliki label yang dikecualikan.
       */
      var shouldExclude = labels.some(function(label) {
        return label.toLowerCase() === excludedLabel;
      });

      if (shouldExclude) {
        wrapper.style.display = 'none';
        return;
      }

      /*
       * Normalisasi URL agar artikel saat ini
       * tidak muncul kembali sebagai artikel terkait.
       */
      function normalizeUrl(url) {
        try {
          var parsed = new URL(url, location.origin);

          parsed.search = '';
          parsed.hash = '';

          return parsed.href.replace(/\/+$/, '');
        } catch (e) {
          return String(url || '')
            .split('?')[0]
            .split('#')[0]
            .replace(/\/+$/, '');
        }
      }

      var currentUrl = normalizeUrl(location.href);

      /*
       * Mengubah HTML menjadi teks biasa.
       */
      function textOnly(html) {
        var el = document.createElement('div');

        el.innerHTML = html || '';

        return (el.textContent || el.innerText || '').trim();
      }

      /*
       * Mengamankan teks sebelum dimasukkan ke HTML.
       */
      function esc(value) {
        return String(value || '').replace(/[&<>"']/g, function(c) {
          return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          }[c];
        });
      }

      /*
       * Mengambil tautan artikel.
       */
      function getLink(entry) {
        var links = entry.link || [];

        for (var i = 0; i < links.length; i++) {
          if (links[i].rel === 'alternate') {
            return links[i].href || '';
          }
        }

        return '';
      }

      /*
       * Mengambil gambar thumbnail.
       * Jika thumbnail tidak tersedia, gunakan
       * gambar pertama dari isi artikel.
       */
      function getImage(entry) {
        if (entry.media$thumbnail && entry.media$thumbnail.url) {
          return entry.media$thumbnail.url.replace(
            /\/s72-c\//,
            '/w480-h270-p-k-no-nu/'
          );
        }

        var html = entry.content && entry.content.$t
          ? entry.content.$t
          : (entry.summary && entry.summary.$t || '');

        var match = html.match(/<img[^>]+src=["']([^"']+)["']/i);

        return match ? match[1] : '';
      }

      /*
       * Mengacak urutan artikel menggunakan
       * Fisher-Yates Shuffle.
       */
      function shuffleArray(array) {
        for (var i = array.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));

          var temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }

        return array;
      }

      /*
       * Menampilkan maksimal tiga artikel acak.
       */
      function showRandomPosts(entries) {
        var seen = {};
        var candidates = [];

        entries.forEach(function(entry) {
          var url = getLink(entry);

          if (!url) {
            return;
          }

          var normalized = normalizeUrl(url);

          /*
           * Jangan tampilkan artikel yang sedang dibaca
           * dan jangan tampilkan artikel duplikat.
           */
          if (normalized === currentUrl || seen[normalized]) {
            return;
          }

          seen[normalized] = true;

          candidates.push(entry);
        });

        /*
         * Acak semua kandidat sebelum mengambil
         * maksimal tiga artikel.
         */
        shuffleArray(candidates);

        var chosen = candidates.slice(0, 3);

        if (!chosen.length) {
          return false;
        }

        list.innerHTML = chosen.map(function(entry) {
          var url = getLink(entry);

          var title = textOnly(
            entry.title && entry.title.$t
          );

          var summary = textOnly(
            entry.summary && entry.summary.$t
              ? entry.summary.$t
              : (entry.content && entry.content.$t || '')
          );

          var image = getImage(entry);

          /*
           * Batasi panjang ringkasan.
           */
          var shortSummary = summary.slice(0, 110);

          if (summary.length > 110) {
            shortSummary += '...';
          }

          return '<article class="related-card">' +
            '<a href="' + esc(url) + '">' +

              (image
                ? '<img src="' + esc(image) +
                  '" alt="' + esc(title) +
                  '" loading="lazy"/>'
                : '<div style="width:100%;aspect-ratio:16/9;background:#eee;"></div>') +

              '<div class="related-content">' +
                '<h4>' + esc(title) + '</h4>' +
                '<p>' + esc(shortSummary) + '</p>' +
              '</div>' +

            '</a>' +
          '</article>';
        }).join('');

        status.style.display = 'none';

        return true;
      }

      /*
       * Ambil artikel dari seluruh label yang dimiliki
       * artikel saat ini, kemudian gabungkan hasilnya.
       *
       * Dengan demikian, artikel terkait tidak hanya
       * bergantung pada label pertama.
       */
      var allEntries = [];
      var loadedLabels = 0;

      function finishLoading() {
        if (showRandomPosts(allEntries)) {
          return;
        }

        status.style.display = 'none';
        list.innerHTML = '';
      }

      function loadLabel(index) {
        if (index >= labels.length) {
          finishLoading();
          return;
        }

        var feedUrl = location.origin +
          '/feeds/posts/summary/-/' +
          encodeURIComponent(labels[index]) +
          '?alt=json&max-results=20';

        fetch(feedUrl)
          .then(function(response) {
            if (!response.ok) {
              throw new Error('Feed gagal dimuat');
            }

            return response.json();
          })
          .then(function(data) {
            var entries = data.feed && data.feed.entry
              ? data.feed.entry
              : [];

            allEntries = allEntries.concat(entries);
          })
          .catch(function() {
            /*
             * Jika salah satu label gagal dimuat,
             * lanjutkan mencoba label berikutnya.
             */
          })
          .then(function() {
            loadedLabels++;

            if (loadedLabels >= labels.length) {
              finishLoading();
            } else {
              loadLabel(index + 1);
            }
          });
      }

      /*
       * Mulai mengambil artikel.
       */
      if (labels.length) {
        loadLabel(0);
      } else {
        status.style.display = 'none';
      }
    })();