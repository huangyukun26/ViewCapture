<?php

header('Access-Control-Allow-Origin: *');



$view_id=$_GET['view_id'];
$view_no=$_GET['view_no'];

$row = 0;

$result=null;
if (($handle = fopen("./input/20240707_Japan_bldg_attribute/kyoto_bldg_height_base.csv", "r")) !== FALSE) {
  while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
	  
	if ($row>= $view_id && $row< $view_id+$view_no){
		// $result.$data[0].",".
		$result=$result.$data[0].",".$data[1].",".$data[2].",";
	}
	$row++;
  }
  
  echo $result;
  fclose($handle);
}