
# Letecké mapovanie prostredia pomocou lidaru

**Predmet:** Navigačné metódy v robotike (zimný semester 2026/27)
**Zadanie č. 8**, repozitár `8_UT_10_50`
**Tím:** Anatolii Vasylov, Rostyslav Rodzhuk

## 1. Cieľ

Dron so zabudovaným 3D lidarom systematicky preletí definovanú oblasť a vytvorí jej 3D mapu (mračno bodov). Riešenie je overené na dvoch rôznych typoch prostredia: kopcovitý terén a mesto s budovami rôznej výšky.

Podľa vyučujúceho je podstatou zadania mapovanie prostredia dronom, nie riadenie a stabilizácia drona. Dron je preto modelovaný kinematicky (pozri časť 4).

## 2. Použité nástroje

- ROS 2 Jazzy, Python 3.12, numpy
- Gazebo (gz sim, Harmonic) a `ros_gz_bridge`
- RViz2 na vizualizáciu

## 3. Architektúra

```
Gazebo (svet + dron + lidar)
   |  poloha drona, mračno bodov      ^  cmd_vel
   v                                  |
ros_gz_bridge  <---------------------+
   |                 |                 |
   v                 v                 v
drone_pose_tf   mapping_node     coverage_planner
(TF map ->       (mračno bodov    (trasa + riadenie
 drone/base_link) v systéme map,   rýchlosti + sledovanie
                  voxel filter,    terénu)
                  export .ply)
```

| Uzol | Úloha |
|---|---|
| `drone_pose_tf` | Prevádza polohu drona z Gazebo na TF `map -> drone/base_link`. |
| `coverage_planner` | Navigačný algoritmus: trasa typu „kosačka" (boustrophedon), výpočet rýchlosti k ďalšiemu bodu a sledovanie terénu pomocou lidaru. Publikuje `cmd_vel` a plánovanú trasu `/planned_path`. |
| `mapping_node` | Transformuje body lidaru do systému `map`, akumuluje ich s voxel filtrom a ukladá mapu do `.ply` (služba `/save_map`, ukladanie aj pri ukončení). Publikuje `/map_points`. |

## 4. Návrh robota

Dron je vlastný model (`models/drone/model.sdf`) tvaru kvadrokoptéry. Konštrukčné rozhodnutia:

- **Lidar nasmerovaný nadol.** Senzor `gpu_lidar` je otočený o 90°, takže vejár skenuje kolmo na smer letu. Horizontálny rozsah je ±1,2 rad (približne ±69°), vertikálny ±0,35 rad (približne ±20°), rozlíšenie 720 × 32 lúčov, dosah 0,1 až 50 m, frekvencia 10 Hz. Z výšky 5 m tak jeden prelet pokryje pás široký približne 26 m, preto sa susedné pásy prekrývajú.
- **Kinematický model.** Dron sa riadi príkazmi rýchlosti (`cmd_vel`) cez systém Gazebo `VelocityControl`, gravitácia na ňom je vypnutá a motory ani vrtule nie sú simulované. Vrtule a ramená sú len vizuálne. Je to vedomé zjednodušenie: dôraz je na navigácii a mapovaní.
- Polohu drona publikuje systém `PosePublisher` (poloha zo simulátora, nejde o SLAM).

## 5. Navigačný algoritmus

**Coverage path planning („kosačka", boustrophedon).** Z parametrov (polovičná veľkosť oblasti, rozostup pásov) sa vygenerujú pásy rovnobežné s osou X, medzi nimi sa dron posúva v osi Y. V meste sa po prvom prechode letí druhý, kolmý prechod (pásy rovnobežné s osou Y), aby boli vidieť aj steny budov z druhého smeru.

**Riadenie.** Každých 50 ms uzol zoberie polohu z TF a spočíta vektor k ďalšiemu bodu. Rýchlosť je úmerná vzdialenosti (`kp = 1,0`) a obmedzená na 2 m/s. Bod je dosiahnutý pri vzdialenosti menšej ako 0,5 m. Po poslednom bode sa dron zastaví.

**Sledovanie terénu (konštantná výška nad zemou).** Lidar pozerá nadol, preto planner z mračna bodov v okruhu 2,5 m pod dronom odhadne výšku povrchu (90. percentil výšky bodov, exponenciálne vyhladenie `alpha = 0,4`). Cieľová výška je odhad povrchu plus zadaná výška. Vertikálna rýchlosť je úmerná chybe (`kp_z = 1,2`) a obmedzená na 1,5 m/s. Keď je chyba výšky väčšia ako 2 m, horizontálna rýchlosť sa zníži na 30 %.

## 6. Mapovanie

`mapping_node` pre každé mračno bodov nájde polohu lidaru v systéme `map` (TF), vyradí body bližšie ako 0,5 m a vzdialenejšie ako 40 m, transformuje ich a pridá do mapy s **voxel filtrom 0,1 m**. V každom voxeli sa uchová jeden bod, takže pamäť rastie len s pokrytým povrchom. Výstup je binárny súbor PLY (`maps/map.ply`).

## 7. Prostredia (svety)

| Svet | Súbor | Popis |
|---|---|---|
| Kopce | `worlds/hills_world.sdf` | Terén 60 x 60 m s výškou do 3 m, vygenerovaný ako mriežka OBJ (`models/hills_terrain`). |
| Mesto | `worlds/city_world.sdf` | 16 budov s výškou 3 až 8 m v mriežke 4 x 4 na rovnom teréne. |
| Plochý svet | `worlds/mapping_world.sdf` | Rovná zem a jedna prekážka (testovací svet). |

Poznámka: pôvodne sme terén vytvorili ako `heightmap`, ale ten vo virtuálnom stroji bez GPU zlyhal pri kompilácii shadera, preto je terén vytvorený ako mriežka OBJ.

## 8. Spustenie

Projekt očakáva umiestnenie v `~/drone_lidar_ws` (cesta je zatiaľ pevne daná v launch súbore).

```bash
sudo apt install ros-jazzy-ros-gz ros-jazzy-rviz2 ros-jazzy-tf2-ros python3-numpy

cd ~/drone_lidar_ws
source /opt/ros/jazzy/setup.bash
colcon build --symlink-install
source install/setup.bash
unset LIBGL_ALWAYS_SOFTWARE
```

Spustenie jednotlivých svetov:

```bash
# kopce
ros2 launch drone_lidar_mapping mapping.launch.py world:=hills_world.sdf

# mesto (výška 10 m, oblasť +-26 m, dva prechody)
ros2 launch drone_lidar_mapping mapping.launch.py world:=city_world.sdf \
    altitude:=10.0 half_size:=26.0 passes:=2 lane_spacing:=8.0 voxel:=0.1
```

Alebo skriptom `scripts/run_drone.sh` (po skopírovaní do domovského adresára a vytvorení aliasu `drone`):

```bash
drone hills
drone city
drone city --build    # najprv zostaví projekt
```

Uloženie mapy počas behu: `ros2 service call /save_map std_srvs/srv/Trigger`. Mapa sa ukladá aj pri ukončení (`Ctrl+C`).

Parametre launch súboru: `world`, `altitude`, `half_size`, `passes`, `lane_spacing`, `max_speed`, `voxel`.

## 9. Výsledky

Simulácia bežala vo virtuálnom stroji bez GPU s rýchlosťou približne 0,56 reálneho času.

| | Kopce | Mesto |
|---|---|---|
| Trasa | 8 bodov, približne 150 m | 32 bodov, približne 936 m |
| Prechody | 1 | 2 (osi X a Y) |
| Plánovaný čas (simulácia) | približne 75 s | približne 468 s |
| Cieľová výška nad zemou | 5,0 m | 10,0 m |
| Skutočná výška nad zemou | min 4,76 m, max 5,23 m | min 2,63 m, max 16,78 m |
| Počet bodov v mape | približne 306 000 | 1 711 515 |

Výšku nad zemou počíta planner z vlastného odhadu povrchu, nejde teda o nezávislé meranie.

### Obrázky

![Gazebo - kopce](results/images/gazebo_hills.png)
![Gazebo - mesto](results/images/gazebo_city.png)
![RViz - mapa kopcov](results/images/rviz_hills.png)
![RViz - mapa mesta](results/images/rviz_city.png)
![RViz - plánovaná trasa](results/images/rviz_path.png)

### Video

- Kopce: [ODKAZ NA VIDEO]
- Mesto: [ODKAZ NA VIDEO]

### Mapy (PLY)

`results/hills_map.ply`, `results/city_map.ply` (otvoriť napríklad v CloudCompare alebo MeshLab).

## 10. Obmedzenia a ďalší vývoj

- Dron je kinematický (bez motorov, vrtúľ a stabilizácie), čo vyučujúci pripustil.
- Poloha sa berie zo simulátora, nejde o SLAM ani lokalizáciu z lidaru.
- Navigácia je reaktívna: lidar pozerá nadol a dopredu vidí len približne ±20°. Pri ostrých hranách striech v meste preto výška nad zemou kolíše (min 2,63 m, max 16,78 m pri cieli 10 m). Na plynulom teréne je odchýlka približne ±0,25 m.
- Chýba obchádzanie prekážok. Možné rozšírenie: predný dosahový senzor a filter maxima výšok v smere pohybu.
- Presnosť mapy sme hodnotili len vizuálne.

## 11. Štruktúra repozitára

```
src/drone_lidar_mapping/
  drone_lidar_mapping/   uzly: coverage_planner, mapping_node, drone_pose_tf, utils
  launch/                mapping.launch.py
models/                  drone, hills_terrain
worlds/                  mapping_world, hills_world, city_world
scripts/                 run_drone.sh
results/                 výsledné mapy a obrázky
```

## 12. Použité zdroje

- Gazebo Sim documentation: https://gazebosim.org/docs
- ROS 2 Jazzy documentation: https://docs.ros.org/en/jazzy/
- `ros_gz` (ros_gz_bridge): https://github.com/gazebosim/ros_gz
- Gazebo Sim systémy `VelocityControl`, `PosePublisher` a senzor `gpu_lidar` (dokumentácia Gazebo Sim)
- tf2 a RViz2 (dokumentácia ROS 2 Jazzy)
- H. Choset: *Coverage for robotics - A survey of recent results*, Annals of Mathematics and Artificial Intelligence 31, 2001, s. 113-126
- E. Galceran, M. Carreras: *A survey on coverage path planning for robotics*, Robotics and Autonomous Systems 61(12), 2013, s. 1258-1276
- P. Bourke: *PLY - Polygon File Format*, https://paulbourke.net/dataformats/ply/
- Pri vývoji (návrh a ladenie kódu, dokumentácia) bol použitý AI asistent Claude (Anthropic).

[Doplňte všetky ďalšie tutoriály a stránky, z ktorých ste skutočne čerpali.]
