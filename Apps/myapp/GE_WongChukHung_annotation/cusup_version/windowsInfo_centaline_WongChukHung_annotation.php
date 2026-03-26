<?php

header('Access-Control-Allow-Origin: *');

// 检查是否存在 POST 数据

// $json_data = $_POST;

$jsonData = file_get_contents("php://input");

if (isset($_POST)) {
    // 获取并解码 JSON 数据
    $data = json_decode($jsonData, true);

    // 检查 JSON 解码是否成功
    if (json_last_error() != JSON_ERROR_NONE) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    }
} else {
    // 处理没有 POST 数据的情况
    echo json_encode(['status' => 'error', 'message' => 'No data received']);
}


$data_source_file="./".$data['building_id'].".csv";
echo "./".$data['building_id'].".csv";

$annotation = json_decode($data['annotations'], true);


if (!file_exists($data_source_file)) {
    echo "Not exist!";
    $file = fopen($data_source_file, 'a');

    if (!$file) {
        $error = error_get_last();
        echo "File open failed: " . $error['message'];
    } else {
        fwrite($file, 'Hello, World!');
        fclose($file);
    }

    $head = ['uid' =>"uid",'layout_id' => 'layout_id','building_id'=> 'building_id', 'unit_id' => 'unit_id','floor_id_start' => "floor_id_start", 'floor_id_end' =>"floor_id_end",'ann_id' => "ann_id", "x" => 'x', 'y' => 'y', 'z' => 'z',];
    fputcsv($file, $head);

    foreach ($annotation as $row){
        $each_row = [
            'uid' => $row['uid'],
            'layout_id' => $row['layout_id'],
            'building_id' => $row['building_id'],
            'unit_id' => $row['unit_id'],
            'floor_id_start' => $row['floor_id_start'],
            'floor_id_end' => $row['floor_id_end'],
            'ann_id' => $row["id"],
            'x' => $row["x"],
            'y' => $row["y"],
            'z' => $row["height"],        

        ];

        fputcsv($file, $each_row);
    }
    
    fclose($file);

} else {
    echo "Exist!";

    $file = fopen($data_source_file, 'a+');

    foreach ($annotation as $row){
        $each_row = [
            'uid' => $row['uid'],
            'layout_id' => $row['layout_id'],
            'building_id' => $row['building_id'],
            'unit_id' => $row['unit_id'],
            'floor_id_start' => $row['floor_id_start'],
            'floor_id_end' => $row['floor_id_end'],
            'ann_id' => $row["id"],
            'x' => $row["x"],
            'y' => $row["y"],
            'z' => $row["height"],         

        ];

        fputcsv($file, $each_row);
    }

    fclose($file);
}


    echo "submission is successful!";
    ?>
