<!DOCTYPE html>
<html>
    <head>
        <title>Testing stuff</title>
        <script src="js/lib/jquery-1.8.3.min.js"></script>
        <script src="js/core.js"></script>
        <script>
            $(function() {
                /*var tbl = $('<table>');
                var row1 = $('<tr>');
                var row2 = $('<tr>');
                var td11 = $('<td>');
                var td12 = $('<td>');
                var td21 = $('<td>');
                var td22 = $('<td>');
                td11.html('(row 1 column 1)');
                td12.html('(row 1 column 2)');
                td21.html('(row 2 column 1)');
                td22.html('(row 2 column 2)');
                row1.append(td11, td12);
                row2.append(td21, td22);
                tbl.append(row1, row2);*/
                var content = ['a', 'b', 'c', 'd'];
                var tbl = $('<table>').append(
                    $('<tr>').append(
                        $('<td>').html('(A row 1 column 1)'),
                        $('<td>').html('(A row 1 column 2)')
                    ),
                    
                    content.map(function(e){
                        return $('<td>').html(e);
                    })
                );
                $('#content').append(tbl);
            });
        </script>
        <style>
        </style>
    </head>
    <body>
        <div id="content">
        </div>
    </body>
</html>