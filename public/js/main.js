// Table Function
function addRow() {
    var carYears = document.getElementById("car-years");
    var carMakes = document.getElementById("car-makes");
    var carModels = document.getElementById("car-models");
    // var carTrims = document.getElementById("car-model-trims");
    var table = document.getElementById("myTable");

    var rowCount = table.rows.length;
    var row = table.insertRow(rowCount);

    row.insertCell(0).innerHTML= carYears.value;
    row.insertCell(1).innerHTML= carMakes.value;
    row.insertCell(2).innerHTML= carModels.value;
    // row.insertCell(3).innerHTML= carTrims.value;
    row.insertCell(3).innerHTML= '<div class="delete-btn-container"><button class="delete-btn" type="button" value="Delete" onclick="Javascript:deleteRow(this)">Delete</button></div>';
}

function deleteRow(obj) {
    var index = obj.parentNode.parentNode.rowIndex;
    var table = document.getElementById("myTable");
    table.deleteRow(index);
}

function addTable() {

var myTableDiv = document.getElementById("myDynamicTable");
  
var table = document.createElement('TABLE');
table.border='1';

var tableBody = document.createElement('TBODY');
table.appendChild(tableBody);
  
for (var i=0; i<3; i++){
   var tr = document.createElement('TR');
   tableBody.appendChild(tr);
   
   for (var j=0; j<4; j++){
       var td = document.createElement('TD');
       td.width='75';
       td.appendChild(document.createTextNode("Cell " + i + "," + j));
       tr.appendChild(td);
   }
}
myTableDiv.appendChild(table);
};

// Hide Table Header
$('.hidethis').hide();

// Autoplay Video
let vid = document.getElementById('video');
vid.autoplay = true;
vid.load();