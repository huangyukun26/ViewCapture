<?php

header('Access-Control-Allow-Origin: *');



$view_id=$_GET['view_id'];
$view_no=$_GET['view_no'];

$row = 0;

$result=null;
if (($handle = fopen("./input/20250223_sammy_help/view_site_w_heading_for_pose.csv", "r")) !== FALSE) {
  while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
	  
	if ($row>= $view_id && $row< $view_id+$view_no){
		// $result.$data[0].",".
		$result=$result.$data[0].",".$data[1].",".$data[2].",".$data[3].",".$data[4].",".$data[5].",".$data[6].",";
	}
	$row++;
  }
  
  echo $result;
  fclose($handle);
}